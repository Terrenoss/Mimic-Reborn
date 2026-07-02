using System.Text.Json;
using Microsoft.Win32;

namespace Conduit;

public class Settings
{
    public HashSet<string> ApprovedDevices { get; set; } = new();
}

/// <summary>
/// Stores settings as JSON in %APPDATA%\Mimic-Reborn and manages the
/// launch-at-startup registry entry.
/// </summary>
public static class Persistence
{
    private const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";

    private static readonly string SettingsPath = Path.Combine(MimicConfig.AppDataDir, "settings.json");
    private static readonly Lock WriteLock = new();
    private static Settings? _settings;

    public static Settings Load()
    {
        if (_settings != null) return _settings;

        try
        {
            _settings = JsonSerializer.Deserialize<Settings>(File.ReadAllText(SettingsPath));
        }
        catch
        {
            // Missing or corrupt settings: start fresh.
        }

        return _settings ??= new Settings();
    }

    private static void Save()
    {
        lock (WriteLock)
        {
            Directory.CreateDirectory(MimicConfig.AppDataDir);
            File.WriteAllText(SettingsPath, JsonSerializer.Serialize(Load()));
        }
    }

    public static bool IsDeviceApproved(string identity) => Load().ApprovedDevices.Contains(identity);

    public static void ApproveDevice(string identity)
    {
        Load().ApprovedDevices.Add(identity);
        Save();
    }

    public static bool LaunchesAtStartup()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKey);
        return key?.GetValue(MimicConfig.AppName) != null;
    }

    public static void SetLaunchAtStartup(bool enabled)
    {
        using var key = Registry.CurrentUser.CreateSubKey(RunKey);
        if (enabled)
        {
            key.SetValue(MimicConfig.AppName, Environment.ProcessPath ?? Application.ExecutablePath);
        }
        else
        {
            key.DeleteValue(MimicConfig.AppName, throwOnMissingValue: false);
        }
    }
}
