extends StaticBody2D

## Boneco de treino: vida praticamente infinita (configurada na cena, não
## aqui — ver nota em `boneco_treino.tscn`), não ataca, só existe pra testar
## o hitbox do jogador repetidamente sem precisar derrotar nada.

@onready var vida: Node = $Vida

func _ready() -> void:
	vida.dano_recebido.connect(_ao_receber_dano)

func _ao_receber_dano(quantidade: int) -> void:
	print("Boneco de treino tomou %d de dano" % quantidade)
	modulate = Color(1, 1, 0.3)
	await get_tree().create_timer(0.1).timeout
	modulate = Color(1, 1, 1)
