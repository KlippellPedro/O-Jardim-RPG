param(
  [switch]$BotsOnly,
  [switch]$PlatformOnly
)

$ErrorActionPreference = 'Stop'
if ($BotsOnly -and $PlatformOnly) {
  throw 'Use apenas BotsOnly ou PlatformOnly.'
}
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stageRoot = Join-Path $tempRoot ("jardim-discloud-" + [guid]::NewGuid().ToString('N'))
$platformStage = Join-Path $stageRoot 'plataforma'
$banqueiroStage = Join-Path $stageRoot 'banqueiro'
$jornalistaStage = Join-Path $stageRoot 'jornalista'
$gerenteStage = Join-Path $stageRoot 'gerente'

function Copy-ProjectItem {
  param([string]$Source, [string]$DestinationRoot)
  $sourcePath = Join-Path $root $Source
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Arquivo obrigatorio ausente: $Source"
  }
  Copy-Item -LiteralPath $sourcePath -Destination $DestinationRoot -Recurse -Force
}

function Build-Frontend {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  }
  if (-not $npmCommand) {
    throw 'npm nao encontrado. Instale o Node.js antes de gerar o pacote da plataforma.'
  }

  Push-Location $root
  try {
    & $npmCommand.Source run build
    if ($LASTEXITCODE -ne 0) {
      throw "Build do frontend falhou com codigo $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }

  $requiredBuildItems = @(
    @{ Path = 'dist\index.html'; Type = 'Leaf' },
    @{ Path = 'dist\assets'; Type = 'Container' },
    @{ Path = 'dist\models'; Type = 'Container' }
  )
  foreach ($item in $requiredBuildItems) {
    $absolutePath = Join-Path $root $item.Path
    if (-not (Test-Path -LiteralPath $absolutePath -PathType $item.Type)) {
      throw "Build incompleto: item obrigatorio ausente: $($item.Path)"
    }
  }
}

function Remove-GeneratedPythonFiles {
  param([string]$RootPath)
  $safeRoot = [System.IO.Path]::GetFullPath($RootPath)
  Get-ChildItem -LiteralPath $safeRoot -Recurse -Force -Directory |
    Where-Object { $_.Name -eq '__pycache__' } |
    ForEach-Object {
      $target = [System.IO.Path]::GetFullPath($_.FullName)
      if ($target.StartsWith($safeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $target -Recurse -Force
      }
    }
  Get-ChildItem -LiteralPath $safeRoot -Recurse -Force -File |
    Where-Object { $_.Extension -in @('.pyc', '.pyo') } |
    ForEach-Object {
      $target = [System.IO.Path]::GetFullPath($_.FullName)
      if ($target.StartsWith($safeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $target -Force
      }
    }
}

try {
  if (-not $BotsOnly) {
    Build-Frontend
  }

  New-Item -ItemType Directory -Path $platformStage, $banqueiroStage, $jornalistaStage, $gerenteStage -Force | Out-Null

  if (-not $BotsOnly) {
    @(
      'plataforma\core',
      'plataforma\routers',
      'plataforma\main.py',
      'plataforma\schemas.py',
      'plataforma\requirements.txt',
      'plataforma\discloud.config',
      'plataforma\.discloudignore',
      'plataforma\.gitignore',
      'plataforma\.env.example',
      'plataforma\README.md'
    ) | ForEach-Object { Copy-ProjectItem $_ $platformStage }

    Copy-ProjectItem 'dist' $platformStage

    $platformTools = Join-Path $platformStage 'tools'
    New-Item -ItemType Directory -Path $platformTools -Force | Out-Null
    Copy-ProjectItem 'tools\migrar-inventario-cofre.py' $platformTools

    $platformData = Join-Path $platformStage 'data'
    New-Item -ItemType Directory -Path $platformData -Force | Out-Null
    @('data\ficha', 'data\mundo', 'data\regras') |
      ForEach-Object { Copy-ProjectItem $_ $platformData }
  }

  if (-not $PlatformOnly) {
  @(
    'bots\banqueiro\cogs',
    'bots\banqueiro\core',
    'bots\banqueiro\data',
    'bots\banqueiro\main.py',
    'bots\banqueiro\requirements.txt',
    'bots\banqueiro\discloud.config',
    'bots\banqueiro\.discloudignore',
    'bots\banqueiro\.gitignore',
    'bots\banqueiro\.env.example',
    'bots\banqueiro\README.md'
  ) | ForEach-Object { Copy-ProjectItem $_ $banqueiroStage }

  @(
    'bots\jornalista\cogs',
    'bots\jornalista\core',
    'bots\jornalista\main.py',
    'bots\jornalista\requirements.txt',
    'bots\jornalista\discloud.config',
    'bots\jornalista\.discloudignore',
    'bots\jornalista\.gitignore',
    'bots\jornalista\.env.example',
    'bots\jornalista\README.md'
  ) | ForEach-Object { Copy-ProjectItem $_ $jornalistaStage }

  @(
    'bots\Gerente\cogs',
    'bots\Gerente\core',
    'bots\Gerente\main.py',
    'bots\Gerente\requirements.txt',
    'bots\Gerente\discloud.config',
    'bots\Gerente\.discloudignore',
    'bots\Gerente\.gitignore',
    'bots\Gerente\.env.example',
    'bots\Gerente\README.md'
  ) | ForEach-Object { Copy-ProjectItem $_ $gerenteStage }

  # O Gerente leva uma cópia somente das fontes publicadas para jogadores.
  # data/regras/mestre-v1.json é protegido e não entra no pacote.
  $gerenteDocs = Join-Path $gerenteStage 'fontes\docs\regras'
  $gerenteFicha = Join-Path $gerenteStage 'fontes\data\ficha'
  New-Item -ItemType Directory -Path $gerenteDocs, $gerenteFicha -Force | Out-Null

  @(
    'data\ficha\classes.json',
    'data\ficha\legados.json',
    'data\ficha\legados-novos.json',
    'data\ficha\pericias.json',
    'data\ficha\racas.json'
  ) | ForEach-Object { Copy-ProjectItem $_ $gerenteFicha }

  }

  if (-not $PlatformOnly) {
    Remove-GeneratedPythonFiles $banqueiroStage
    Remove-GeneratedPythonFiles $jornalistaStage
    Remove-GeneratedPythonFiles $gerenteStage
  }
  if (-not $BotsOnly) {
    Remove-GeneratedPythonFiles $platformStage
  }

  $platformZip = Join-Path $root 'plataforma\plataforma-discloud.zip'
  $banqueiroZip = Join-Path $root 'bots\banqueiro\banqueiro-discloud.zip'
  $jornalistaZip = Join-Path $root 'bots\jornalista\jornalista-discloud.zip'
  $gerenteZip = Join-Path $root 'bots\Gerente\gerente-discloud.zip'
  $pacotes = @()
  if (-not $PlatformOnly) {
    if (Test-Path -LiteralPath $banqueiroZip) { Remove-Item -LiteralPath $banqueiroZip -Force }
    if (Test-Path -LiteralPath $jornalistaZip) { Remove-Item -LiteralPath $jornalistaZip -Force }
    if (Test-Path -LiteralPath $gerenteZip) { Remove-Item -LiteralPath $gerenteZip -Force }

    Compress-Archive -Path (Join-Path $banqueiroStage '*') -DestinationPath $banqueiroZip -CompressionLevel Optimal
    Compress-Archive -Path (Join-Path $jornalistaStage '*') -DestinationPath $jornalistaZip -CompressionLevel Optimal
    Compress-Archive -Path (Join-Path $gerenteStage '*') -DestinationPath $gerenteZip -CompressionLevel Optimal
    $pacotes = @($banqueiroZip, $jornalistaZip, $gerenteZip)
  }

  if (-not $BotsOnly) {
    if (Test-Path -LiteralPath $platformZip) { Remove-Item -LiteralPath $platformZip -Force }
    Compress-Archive -Path (Join-Path $platformStage '*') -DestinationPath $platformZip -CompressionLevel Optimal
    $pacotes = @($platformZip) + $pacotes
  }

  Get-Item -LiteralPath $pacotes |
    Select-Object FullName, Length, LastWriteTime
}
finally {
  $resolvedStage = [System.IO.Path]::GetFullPath($stageRoot)
  if ($resolvedStage.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path $resolvedStage -Leaf).StartsWith('jardim-discloud-')) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
