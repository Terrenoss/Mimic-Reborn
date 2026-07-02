using System.Net.Http.Headers;
using System.Text.Json.Nodes;

namespace Conduit;

/// <summary>
/// Checks GitHub releases for a newer version at startup. Deliberately simple:
/// no self-patching, just a notification linking to the releases page.
/// </summary>
public static class UpdateChecker
{
    public static string ReleasesUrl => $"https://github.com/{MimicConfig.GithubRepo}/releases/latest";

    /// <summary>Returns the newer version tag if one exists, otherwise null.</summary>
    public static async Task<string?> CheckForUpdateAsync()
    {
        try
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MimicConduit", MimicConfig.Version));
            http.Timeout = TimeSpan.FromSeconds(10);

            var json = await http.GetStringAsync($"https://api.github.com/repos/{MimicConfig.GithubRepo}/releases/latest");
            var tag = JsonNode.Parse(json)?["tag_name"]?.GetValue<string>();
            if (tag == null) return null;

            var latest = Version.Parse(tag.TrimStart('v', 'V'));
            return latest > Version.Parse(MimicConfig.Version) ? tag : null;
        }
        catch
        {
            return null; // Offline or repo has no releases yet: silently skip.
        }
    }
}
