param(
    [Parameter(Mandatory = $true)][string]$ExePath,
    [Parameter(Mandatory = $true)][string]$PckPath,
    [Parameter(Mandatory = $true)][string]$SaveRoot,
    [ValidateSet('1366x768', '1920x1080')][string]$Resolution = '1366x768'
)

# Read-only artifact inventory, not a playthrough runner. Explicit candidate and
# isolated save paths prevent defaults from touching the owner's real progress.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Sha256Hash([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try { return ([BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
        finally { $sha256.Dispose() }
    }
    finally { $stream.Dispose() }
}

if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) { throw "Missing reviewed EXE artifact: $ExePath" }
if (-not (Test-Path -LiteralPath $PckPath -PathType Leaf)) { throw "Missing reviewed PCK artifact: $PckPath" }
$resolvedExe = (Resolve-Path -LiteralPath $ExePath).Path
$resolvedPck = (Resolve-Path -LiteralPath $PckPath).Path
$resolvedSaveRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($SaveRoot)
$width, $height = $Resolution.Split('x')

[ordered]@{
    generated_at = (Get-Date).ToString('o')
    acceptance_evidence = $false
    binary_launched = $false
    resolution = @{ width = [int]$width; height = [int]$height }
    save_root = $resolvedSaveRoot
    save_exists = (Test-Path -LiteralPath (Join-Path $resolvedSaveRoot 'save_01.json') -PathType Leaf)
    artifacts = @{ exe = $resolvedExe; pck = $resolvedPck }
    hashes = @{ exe_sha256 = (Get-Sha256Hash $resolvedExe); pck_sha256 = (Get-Sha256Hash $resolvedPck) }
} | ConvertTo-Json -Depth 4
