using System.Reflection;

namespace Conduit;

public static class MimicConfig
{
    public const string AppName = "Mimic Conduit";

    // Comes from <Version> in the csproj locally, or -p:Version injected by the
    // release workflow from the git tag. UpdateChecker compares this against
    // the latest GitHub release.
    public static readonly string Version =
        Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0";

    // Port the embedded web server listens on (serves both the UI and the websocket).
    public const int Port = 51000;

    // GitHub repository checked for new releases at startup.
    public const string GithubRepo = "Terrenoss/Mimic-Reborn";

    public static string AppDataDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Mimic-Reborn");
}
