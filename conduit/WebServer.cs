using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Conduit.Lcu;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Conduit;

/// <summary>
/// Embedded Kestrel server: serves the built web UI from wwwroot and accepts
/// mobile connections on /mobile. This replaces the central rift server for
/// LAN usage — the phone talks straight to this process.
/// </summary>
public class WebServer
{
    private readonly LcuConnection _league;
    private readonly Func<string, string, Task<bool>> _requestApproval;
    private WebApplication? _app;

    public WebServer(LcuConnection league, Func<string, string, Task<bool>> requestApproval)
    {
        _league = league;
        _requestApproval = requestApproval;
    }

    public async Task StartAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls($"http://0.0.0.0:{MimicConfig.Port}");

        var app = builder.Build();
        app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(10) });

        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        if (Directory.Exists(wwwroot))
        {
            var fileProvider = new PhysicalFileProvider(wwwroot);
            app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
            app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });
        }

        app.MapGet("/api/info", () => Results.Json(new
        {
            name = MimicConfig.AppName,
            version = MimicConfig.Version,
            machine = Environment.MachineName,
            leagueConnected = _league.IsConnected
        }));

        app.Map("/mobile", async context =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = 400;
                return;
            }

            using var socket = await context.WebSockets.AcceptWebSocketAsync();
            using var session = new MobileSession(socket, _league, _requestApproval);

            try
            {
                await session.RunAsync(context.RequestAborted);
            }
            catch
            {
                // Session ended (disconnect, abort); nothing to do.
            }
        });

        _app = app;
        await app.StartAsync();
    }

    public Task StopAsync() => _app?.StopAsync() ?? Task.CompletedTask;

    /// <summary>Best local LAN IPv4, used to build the URL shown in the QR code.</summary>
    public static string GetLanAddress()
    {
        var candidates =
            from iface in NetworkInterface.GetAllNetworkInterfaces()
            where iface.OperationalStatus == OperationalStatus.Up
                  && iface.NetworkInterfaceType != NetworkInterfaceType.Loopback
                  && !iface.Description.Contains("Virtual", StringComparison.OrdinalIgnoreCase)
            from addr in iface.GetIPProperties().UnicastAddresses
            where addr.Address.AddressFamily == AddressFamily.InterNetwork
            select addr.Address;

        return (candidates.FirstOrDefault() ?? IPAddress.Loopback).ToString();
    }

    public static string GetLanUrl() => $"http://{GetLanAddress()}:{MimicConfig.Port}/";
}
