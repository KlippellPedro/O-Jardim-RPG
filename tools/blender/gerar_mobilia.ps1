# Gera a mobília do construtor de mapas: renderiza no Blender e converte para o site.
# Uso: .\tools\blender\gerar_mobilia.ps1 [-So mesa,cama]
# Grava public/assets/construtor/mobilia/*.webp e src/data/construtor-mobilia.json.
param(
  [string]$So = "",
  [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
)
$script = Join-Path $PSScriptRoot "gerar_mobilia.py"
$png = Join-Path $env:TEMP "jardim-mobilia-png"
New-Item -ItemType Directory -Force $png | Out-Null
$args = @("--background", "--python", $script, "--", "--out", $png)
if ($So) { $args += @("--so", $So) }
& $Blender @args
python (Join-Path $PSScriptRoot "..\mobilia_construtor.py") $png
