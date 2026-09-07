extends Area2D
class_name Hurtbox

## Ponte entre o Hitbox que acertou e o componente Vida do dono. Por padrão
## procura um nó irmão chamado "Vida"; defina `caminho_vida` se a estrutura
## for diferente.

@export var caminho_vida: NodePath
var vida: Node

func _ready() -> void:
	if caminho_vida:
		vida = get_node(caminho_vida)
	else:
		vida = get_parent().get_node_or_null("Vida")

func receber_dano(quantidade: int) -> void:
	if vida:
		vida.receber_dano(quantidade)
