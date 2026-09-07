extends Area2D
class_name Hitbox

## Detecta hurtboxes e aplica dano nelas. Quem liga/desliga `monitoring` é o
## personagem dono (a janela de tempo em que o golpe pode acertar), não este
## script — ele só reage a quem entrou na área enquanto estava ligado.

@export var dano: int = 10

func _ready() -> void:
	area_entered.connect(_ao_entrar_area)

func _ao_entrar_area(area: Area2D) -> void:
	if area.has_method("receber_dano"):
		area.receber_dano(dano)
		Impacto.pausa_curta()
