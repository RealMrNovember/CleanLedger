# Git hooks — block Cursor attribution in commits
#
# Run once per clone:
#   powershell -ExecutionPolicy Bypass -File scripts/install-git-hooks.ps1

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Leaf
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$hookSrc = Join-Path $PSScriptRoot "git-hooks\prepare-commit-msg"
$hookDst = Join-Path $repoRoot ".git\hooks\prepare-commit-msg"

New-Item -ItemType Directory -Force -Path (Split-Path $hookDst) | Out-Null
Copy-Item -Force $hookSrc $hookDst
Write-Host "Installed prepare-commit-msg hook -> $hookDst"
