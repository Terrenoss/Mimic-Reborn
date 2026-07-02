namespace Conduit;

public static class MimicConfig
{
    public const string AppName = "Mimic Conduit";
    public const string Version = "3.0.0";

    // Port the embedded web server listens on (serves both the UI and the websocket).
    public const int Port = 51000;

    // GitHub repository checked for new releases at startup.
    public const string GithubRepo = "Terrenoss/Mimic-Reborn";

    public static string AppDataDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Mimic-Reborn");
}
