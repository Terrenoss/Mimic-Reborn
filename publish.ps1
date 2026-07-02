# Builds the whole of Mimic Reborn into a single self-contained Windows exe.
# Output: conduit\bin\publish\MimicConduit.exe
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "[1/3] Building web UI..." -ForegroundColor Cyan
Push-Location "$root\web"
try {
    npm install
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
} finally {
    Pop-Location
}

Write-Host "[2/3] Embedding web UI into Conduit..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "$root\conduit\wwwroot" -ErrorAction SilentlyContinue
Copy-Item -Recurse "$root\web\dist" "$root\conduit\wwwroot"

Write-Host "[3/3] Publishing Conduit..." -ForegroundColor Cyan
dotnet publish "$root\conduit\Conduit.csproj" -c Release -r win-x64 --self-contained `
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
    -o "$root\conduit\bin\publish"
if ($LASTEXITCODE -ne 0) { throw "Conduit publish failed" }

Write-Host "Done: $root\conduit\bin\publish\MimicConduit.exe" -ForegroundColor Green
