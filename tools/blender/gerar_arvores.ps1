# Gera as 11 Árvores (10 com silhueta própria, ver ESTILOS em generate_tree.py, mais a A.X.I.S).
# Uso: .\tools\blender\gerar_arvores.ps1 [-Saida <pasta>]
# Por padrão grava em public/models/trees (sobrescreve). A.X.I.S usa --mode axis.
param(
  [string]$Saida = (Join-Path $PSScriptRoot "..\..\public\models\trees"),
  [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
)
$script = Join-Path $PSScriptRoot "generate_tree.py"
New-Item -ItemType Directory -Force $Saida | Out-Null
$arvores = @(
  @{ slug = "aethel";          cor = "214,120,156"; seed = 1;  estilo = "genese" },
  @{ slug = "chronus";         cor = "168,138,72";  seed = 2;  estilo = "eon" },
  @{ slug = "ousias";          cor = "222,198,88";  seed = 3;  estilo = "aletheia" },
  @{ slug = "haemus";          cor = "86,172,92";   seed = 4;  estilo = "anima" },
  @{ slug = "moros";           cor = "116,82,52";   seed = 5;  estilo = "baluarte" },
  @{ slug = "aperion";         cor = "132,84,188";  seed = 6;  estilo = "matriz" },
  @{ slug = "ignis";           cor = "222,114,42";  seed = 7;  estilo = "vortice" },
  @{ slug = "erebus";          cor = "130,118,160"; seed = 8;  estilo = "vazio" },
  @{ slug = "mulher-carmesim"; cor = "134,28,48";   seed = 9;  estilo = "limiar" },
  @{ slug = "keryx";           cor = "192,198,206"; seed = 10; estilo = "parley" },
  @{ slug = "axis";            cor = "53,216,236";  seed = 1;  estilo = "padrao"; modo = "axis" }
)
foreach ($a in $arvores) {
  $modo = if ($a.modo) { $a.modo } else { "organica" }
  & $Blender --background --python $script -- --mode $modo --slug $a.slug --color $a.cor --seed $a.seed --estilo $a.estilo --out (Join-Path $Saida "$($a.slug).glb")
}

# Banco Lunar (props): grava em public/models/props ao lado das Árvores.
$propsSaida = Join-Path $Saida "..\props"
New-Item -ItemType Directory -Force $propsSaida | Out-Null
& $Blender --background --python (Join-Path $PSScriptRoot "generate_banco_lunar.py") -- --out (Join-Path $propsSaida "banco-lunar.glb")

# Frutos do Éden (26): grava em public/models/frutos.
& $Blender --background --python (Join-Path $PSScriptRoot "generate_frutos.py") -- --out (Join-Path $Saida "..\frutos")

# Miniaturas dos frutos (cards da Loja): renderiza PNG no Blender e converte para webp.
$png = Join-Path $env:TEMP "frutos-png"
& $Blender --background --python (Join-Path $PSScriptRoot "render_miniaturas_frutos.py") -- --glb (Join-Path $Saida "..\frutos") --out $png
python (Join-Path $PSScriptRoot "..\miniaturas_frutos.py") $png
