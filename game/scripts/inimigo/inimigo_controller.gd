extends CharacterBody2D

## Inimigo temporário da Fase 1: anda de um lado pro outro e machuca no
## toque. Serve pra testar dano recebido e o hitbox do jogador contra um
## alvo que se move, não pra IA de verdade — isso é trabalho de conteúdo,
## não de estrutura.

const VELOCIDADE := 60.0
const GRAVIDADE := 980.0
const DISTANCIA_PATRULHA := 80.0

@onready var vida: Node = $Vida
@onready var origem_x: float = position.x

var direcao := 1.0

func _ready() -> void:
	vida.dano_recebido.connect(_ao_receber_dano)
	vida.morreu.connect(_ao_morrer)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y += GRAVIDADE * delta

	if position.x > origem_x + DISTANCIA_PATRULHA:
		direcao = -1.0
	elif position.x < origem_x - DISTANCIA_PATRULHA:
		direcao = 1.0
	velocity.x = direcao * VELOCIDADE

	move_and_slide()

func _ao_receber_dano(quantidade: int) -> void:
	print("Inimigo tomou %d de dano (vida %d/%d)" % [quantidade, vida.vida_atual, vida.vida_maxima])
	modulate = Color(1, 0.4, 0.4)
	await get_tree().create_timer(0.15).timeout
	modulate = Color(1, 1, 1)

func _ao_morrer() -> void:
	print("Inimigo derrotado")
	queue_free()
