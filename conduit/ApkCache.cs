using System.Net.Http.Headers;
using System.Text.Json.Nodes;

namespace Conduit;

/// <summary>
/// Keeps a local copy of the latest released Mimic.apk so phones can update
/// straight from this PC (served on /apk) instead of hunting for it on GitHub.
/// </summary>
public static class ApkCache
{
    public static string ApkPath => Path.Combine(MimicConfig.AppDataDir, "Mimic.apk");
    private static string VersionPath => ApkPath + ".version";

    /// <summary>Version of the cached APK (release tag without the 'v'), or null.</summary>
    public static string? ApkVersion { get; private set; }

    /// <summary>Loads the cached version marker, then refreshes from GitHub if outdated.</summary>
    public static async Task RefreshAsync()
    {
        if (File.Exists(ApkPath) && File.Exists(VersionPath))
        {
            ApkVersion = File.ReadAllText(VersionPath).Trim();
        }

        try
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MimicConduit", MimicConfig.Version));
            http.Timeout = TimeSpan.FromMinutes(3);

            var json = await http.GetStringAsync($"https://api.github.com/repos/{MimicConfig.GithubRepo}/releases/latest");
            var release = JsonNode.Parse(json);
            var tag = release?["tag_name"]?.GetValue<string>()?.TrimStart('v', 'V');
            if (tag == null || tag == ApkVersion) return;

            var url = release?["assets"]?.AsArray()
                .FirstOrDefault(asset => asset?["name"]?.GetValue<string>() == "Mimic.apk")?
                ["browser_download_url"]?.GetValue<string>();
            if (url == null) return;

            Directory.CreateDirectory(MimicConfig.AppDataDir);
            var bytes = await http.GetByteArrayAsync(url);
            await File.WriteAllBytesAsync(ApkPath, bytes);
            await File.WriteAllTextAsync(VersionPath, tag);
            ApkVersion = tag;
        }
        catch
        {
            // Offline or no release with an APK yet; keep whatever is cached.
        }
    }
}
