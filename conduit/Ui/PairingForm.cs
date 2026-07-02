using QRCoder;

namespace Conduit.Ui;

/// <summary>
/// Shows the QR code and URL a phone uses to connect over the local network.
/// </summary>
public class PairingForm : Form
{
    public PairingForm()
    {
        var url = WebServer.GetLanUrl();

        Text = $"{MimicConfig.AppName} v{MimicConfig.Version}";
        ClientSize = new Size(420, 560);
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(1, 10, 19);

        var title = new Label
        {
            Text = "Scan with your phone",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            ForeColor = Color.FromArgb(240, 230, 210),
            TextAlign = ContentAlignment.MiddleCenter,
            Dock = DockStyle.Top,
            Height = 60
        };

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qr = new QRCode(data);

        var qrBox = new PictureBox
        {
            Image = qr.GetGraphic(10, Color.Black, Color.White, true),
            SizeMode = PictureBoxSizeMode.Zoom,
            Size = new Size(320, 320),
            Location = new Point(50, 70)
        };

        var urlLabel = new Label
        {
            Text = url,
            Font = new Font("Consolas", 14),
            ForeColor = Color.FromArgb(200, 170, 110),
            TextAlign = ContentAlignment.MiddleCenter,
            Location = new Point(0, 400),
            Size = new Size(420, 30)
        };

        var hint = new Label
        {
            Text = "Your phone must be on the same Wi-Fi network as this computer.\n" +
                   "Open the address above in your phone's browser, or scan the QR code.\n" +
                   "For remote access away from home, see the README (Tailscale / self-hosted relay).",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(160, 160, 160),
            TextAlign = ContentAlignment.MiddleCenter,
            Location = new Point(10, 435),
            Size = new Size(400, 70)
        };

        var startupCheck = new CheckBox
        {
            Text = "Launch when computer starts",
            Checked = Persistence.LaunchesAtStartup(),
            ForeColor = Color.FromArgb(240, 230, 210),
            Location = new Point(120, 515),
            Size = new Size(250, 30)
        };
        startupCheck.CheckedChanged += (_, _) => Persistence.SetLaunchAtStartup(startupCheck.Checked);

        Controls.AddRange([title, qrBox, urlLabel, hint, startupCheck]);
    }
}
