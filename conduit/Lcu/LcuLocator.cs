using System.Diagnostics;
using System.Management;
using System.Text.RegularExpressions;

namespace Conduit.Lcu;

public record LcuCredentials(int Port, string AuthToken);

/// <summary>
/// Locates the running League client and extracts the local API credentials.
/// Primary strategy: read the lockfile next to the client executable.
/// Fallback: parse the LeagueClientUx command line via WMI (like Mimic v2 did).
/// </summary>
public static partial class LcuLocator
{
    [GeneratedRegex("\"--remoting-auth-token=(.+?)\"")]
    private static partial Regex AuthTokenRegex();

    [GeneratedRegex("\"--app-port=(\\d+?)\"")]
    private static partial Regex PortRegex();

    public static LcuCredentials? FindLeagueClient()
    {
        foreach (var process in Process.GetProcessesByName("LeagueClientUx"))
        {
            try
            {
                var fromLockfile = TryReadLockfile(process);
                if (fromLockfile != null) return fromLockfile;

                var fromCommandLine = TryParseCommandLine(process.Id);
                if (fromCommandLine != null) return fromCommandLine;
            }
            catch
            {
                // Process may have exited or be inaccessible; try the next one.
            }
            finally
            {
                process.Dispose();
            }
        }

        return null;
    }

    private static LcuCredentials? TryReadLockfile(Process process)
    {
        // MainModule is only accessible at the same elevation level as the LCU.
        string? dir;
        try
        {
            dir = Path.GetDirectoryName(process.MainModule?.FileName);
        }
        catch
        {
            return null;
        }

        if (dir == null) return null;

        var lockfilePath = Path.Combine(dir, "lockfile");
        if (!File.Exists(lockfilePath)) return null;

        // The lockfile is held open with write access by the client, so share everything.
        using var stream = new FileStream(lockfilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        using var reader = new StreamReader(stream);

        // Format: name:pid:port:token:protocol
        var parts = reader.ReadToEnd().Split(':');
        if (parts.Length < 5) return null;

        return new LcuCredentials(int.Parse(parts[2]), parts[3]);
    }

    private static LcuCredentials? TryParseCommandLine(int pid)
    {
        using var searcher = new ManagementObjectSearcher(
            $"SELECT CommandLine FROM Win32_Process WHERE ProcessId = {pid}");

        foreach (var obj in searcher.Get())
        {
            var commandLine = obj["CommandLine"]?.ToString();
            if (commandLine == null) continue;

            var tokenMatch = AuthTokenRegex().Match(commandLine);
            var portMatch = PortRegex().Match(commandLine);
            if (!tokenMatch.Success || !portMatch.Success) continue;

            return new LcuCredentials(int.Parse(portMatch.Groups[1].Value), tokenMatch.Groups[1].Value);
        }

        return null;
    }
}
