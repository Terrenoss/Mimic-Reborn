using System.Diagnostics;
using Conduit.Lcu;
using Conduit.Ui;

namespace Conduit;

public static class Program
{
    [STAThread]
    public static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new TrayContext());
    }
}

/// <summary>
/// Tray-only application: starts the LCU connection and the embedded web server,
/// exposes a context menu, and marshals device-approval prompts to the UI thread.
/// </summary>
public class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _tray;
    private readonly LcuConnection _league = new();
    private readonly WebServer _server;
    private readonly SynchronizationContext _uiContext;
    private PairingForm? _pairingForm;

    public TrayContext()
    {
        _uiContext = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
        _server = new WebServer(_league, RequestApprovalAsync);

        var statusItem = new ToolStripMenuItem("League: not detected") { Enabled = false };
        _league.OnConnected += () => _uiContext.Post(_ => statusItem.Text = "League: connected", null);
        _league.OnDisconnected += () => _uiContext.Post(_ => statusItem.Text = "League: not detected", null);

        var menu = new ContextMenuStrip();
        menu.Items.Add(new ToolStripMenuItem($"{MimicConfig.AppName} {MimicConfig.Version}") { Enabled = false });
        menu.Items.Add(statusItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Connect a phone...", null, (_, _) => ShowPairingWindow());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Quit", null, (_, _) => Exit());

        _tray = new NotifyIcon
        {
            Icon = LoadIcon(),
            Text = MimicConfig.AppName,
            ContextMenuStrip = menu,
            Visible = true
        };
        _tray.MouseClick += (_, e) =>
        {
            if (e.Button == MouseButtons.Left) ShowPairingWindow();
        };

        _league.Start();
        _ = StartServerAsync();
        _ = NotifyOnUpdateAsync();
        _ = ApkCache.RefreshAsync();

        _tray.ShowBalloonTip(5000, MimicConfig.AppName,
            $"Mimic is running. Open {WebServer.GetLanUrl()} on your phone, or click this icon for a QR code.",
            ToolTipIcon.Info);
    }

    private static Icon LoadIcon()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "mimic.ico");
        if (File.Exists(path)) return new Icon(path);
        return Icon.ExtractAssociatedIcon(Environment.ProcessPath!) ?? SystemIcons.Application;
    }

    private async Task StartServerAsync()
    {
        try
        {
            await _server.StartAsync();
        }
        catch (Exception ex)
        {
            _uiContext.Post(_ =>
            {
                MessageBox.Show(
                    $"Mimic could not start its local server on port {MimicConfig.Port}.\n\n{ex.Message}",
                    MimicConfig.AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
                Exit();
            }, null);
        }
    }

    private async Task NotifyOnUpdateAsync()
    {
        var newVersion = await UpdateChecker.CheckForUpdateAsync();
        if (newVersion == null) return;

        _uiContext.Post(_ =>
        {
            _tray.BalloonTipClicked += (_, _) =>
                Process.Start(new ProcessStartInfo(UpdateChecker.ReleasesUrl) { UseShellExecute = true });
            _tray.ShowBalloonTip(10000, MimicConfig.AppName,
                $"Version {newVersion} is available. Click to download.", ToolTipIcon.Info);
        }, null);
    }

    private Task<bool> RequestApprovalAsync(string device, string browser)
    {
        var completion = new TaskCompletionSource<bool>();
        _uiContext.Post(_ =>
        {
            using var prompt = new ApprovalForm(device, browser);
            completion.SetResult(prompt.ShowDialog() == DialogResult.Yes);
        }, null);
        return completion.Task;
    }

    private void ShowPairingWindow()
    {
        if (_pairingForm is { IsDisposed: false })
        {
            _pairingForm.Activate();
            return;
        }

        _pairingForm = new PairingForm();
        _pairingForm.Show();
    }

    private void Exit()
    {
        _tray.Visible = false;
        _league.Dispose();
        _ = _server.StopAsync();
        Application.Exit();
    }
}
