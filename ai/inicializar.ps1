# Prepara C:\saas_documents para trabajar con Claude Code.
# Uso, desde la raíz del proyecto:  powershell -ExecutionPolicy Bypass -File .\ai\inicializar.ps1
# No instala nada por su cuenta: revisa, avisa y, si el repositorio es nuevo, hace el primer commit.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$faltan = @()

function Revisar($nombre, $comando, $instalar, $minimo = $null) {
    $cmd = Get-Command $comando -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Host "  [falta] $nombre  ->  $instalar" -ForegroundColor Red
        $script:faltan += $nombre
        return
    }
    $version = (& $comando --version 2>$null | Select-Object -First 1)
    if ($minimo -and ($version -match '(\d+)\.') -and ([int]$Matches[1] -lt $minimo)) {
        Write-Host "  [viejo] $nombre $version (se requiere $minimo o superior)  ->  $instalar" -ForegroundColor Yellow
        $script:faltan += $nombre
        return
    }
    Write-Host "  [ok]    $nombre $version" -ForegroundColor Green
}

Write-Host "`n1. Herramientas" -ForegroundColor Cyan
Revisar "Git"            "git"    "winget install --id Git.Git -e"
Revisar "Docker"         "docker" "winget install --id Docker.DockerDesktop -e  (requiere WSL 2)"
Revisar "uv"             "uv"     "winget install --id astral-sh.uv -e"
Revisar "Node.js"        "node"   "winget install --id OpenJS.NodeJS.LTS -e" 24
Revisar "Claude Code"    "claude" "https://code.claude.com/docs/en/setup"

if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [aviso] Docker está instalado pero no responde: abre Docker Desktop." -ForegroundColor Yellow
        $faltan += "Docker en ejecución"
    } else {
        docker compose version *> $null
        if ($LASTEXITCODE -eq 0) { Write-Host "  [ok]    docker compose" -ForegroundColor Green }
    }
}

if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv python find 3.13 *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [falta] Python 3.13 para uv  ->  uv python install 3.13" -ForegroundColor Red
        $faltan += "Python 3.13"
    } else {
        Write-Host "  [ok]    Python 3.13 (uv)" -ForegroundColor Green
    }
}

Write-Host "`n2. Archivos del proyecto" -ForegroundColor Cyan
$requeridos = @(
    "CLAUDE.md", "ai\handoff\README.md", "ai\handoff\siguiente.md", "ai\handoff\reporte.md",
    ".claude\settings.json", "docs\arquitectura.md", "docs\grafo-conocimiento\grafo.json",
    "docs\operaciones\catalogo.json"
)
foreach ($f in $requeridos) {
    if (Test-Path $f) { Write-Host "  [ok]    $f" -ForegroundColor Green }
    else { Write-Host "  [falta] $f" -ForegroundColor Red; $faltan += $f }
}
$e2 = Get-ChildItem "docs\modelos" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "LEEME.md" }
if (-not $e2) {
    Write-Host "  [aviso] No está el modelado de datos (E-2) en docs\modelos. T-01 no lo necesita; T-02 sí." -ForegroundColor Yellow
}

Write-Host "`n3. Repositorio git" -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "  Sin git no se puede continuar." -ForegroundColor Red
} elseif (-not (Test-Path ".git")) {
    git init -b main | Out-Null
    git add -A
    git commit -m "T-00: base del proyecto, documentación y handoff" | Out-Null
    Write-Host "  [ok]    Repositorio creado con el primer commit:" -ForegroundColor Green
    git log --oneline -1
} else {
    Write-Host "  El repositorio ya existía. Revisa los cambios y haz el commit tú:" -ForegroundColor Yellow
    git status --short
    Write-Host "  git add -A ; git commit -m `"T-00: base del proyecto, documentación y handoff`""
}

Write-Host ""
if ($faltan.Count -gt 0) {
    Write-Host "Pendiente antes de abrir Claude Code: $($faltan -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "Todo listo. Abre Claude Code en esta carpeta con:  claude" -ForegroundColor Green
    Write-Host "y escribe:  Lee CLAUDE.md y ejecuta la tarea de ai/handoff/siguiente.md siguiendo la skill handoff."
}
