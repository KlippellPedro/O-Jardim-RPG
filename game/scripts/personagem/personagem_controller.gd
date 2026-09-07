extends CharacterBody2D

## Controlador de movimento e combate da Fase 1 (prova de diversão). Ainda é
## um personagem genérico, não o kit real de nenhum dos cinco (isso é Fase
## 3) — só prova se correr/pular/esquivar/atacar já é gostoso antes de
## produzir arte ou os kits de verdade.

const VELOCIDADE := 220.0
const FORCA_PULO := 420.0
const GRAVIDADE := 980.0
const VELOCIDADE_ESQUIVA := 420.0
const DURACAO_ESQUIVA := 0.2
const COOLDOWN_ESQUIVA := 0.4
const DURACAO_ATAQUE := 0.15
const COOLDOWN_ATAQUE := 0.35

@onready var vida: Node = $Vida
@onready var hitbox: Area2D = $Hitbox
@onready var visual_golpe: ColorRect = $Hitbox/VisualGolpe
@onready var camera: Camera2D = $Camera2D

var olhando_direita := true
var esquivando := false
var atacando := false
var pode_esquivar := true
var pode_atacar := true

func _ready() -> void:
	hitbox.monitoring = false
	vida.dano_recebido.connect(_ao_receber_dano)
	vida.morreu.connect(_ao_morrer)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y += GRAVIDADE * delta

	var direcao := Input.get_axis("mover_esquerda", "mover_direita")
	if direcao != 0.0:
		olhando_direita = direcao > 0.0
	if not esquivando:
		velocity.x = direcao * VELOCIDADE

	if Input.is_action_just_pressed("pular") and is_on_floor():
		velocity.y = -FORCA_PULO

	if Input.is_action_just_pressed("esquivar") and pode_esquivar and not esquivando:
		_esquivar()

	if Input.is_action_just_pressed("atacar") and pode_atacar and not atacando:
		_atacar()

	hitbox.position.x = abs(hitbox.position.x) * (1.0 if olhando_direita else -1.0)

	move_and_slide()

func _esquivar() -> void:
	esquivando = true
	pode_esquivar = false
	vida.invulneravel = true
	velocity.x = VELOCIDADE_ESQUIVA * (1.0 if olhando_direita else -1.0)
	await get_tree().create_timer(DURACAO_ESQUIVA).timeout
	esquivando = false
	vida.invulneravel = false
	await get_tree().create_timer(COOLDOWN_ESQUIVA).timeout
	pode_esquivar = true

func _atacar() -> void:
	atacando = true
	pode_atacar = false
	hitbox.monitoring = true
	visual_golpe.visible = true
	await get_tree().create_timer(DURACAO_ATAQUE).timeout
	hitbox.monitoring = false
	visual_golpe.visible = false
	atacando = false
	await get_tree().create_timer(COOLDOWN_ATAQUE).timeout
	pode_atacar = true

func _ao_receber_dano(quantidade: int) -> void:
	print("Jogador tomou %d de dano (vida %d/%d)" % [quantidade, vida.vida_atual, vida.vida_maxima])
	modulate = Color(1, 0.4, 0.4)
	_tremer_camera()
	await get_tree().create_timer(0.15).timeout
	modulate = Color(1, 1, 1)

func _tremer_camera(intensidade: float = 6.0, duracao: float = 0.15) -> void:
	var tempo := 0.0
	while tempo < duracao:
		camera.offset = Vector2(randf_range(-intensidade, intensidade), randf_range(-intensidade, intensidade))
		await get_tree().create_timer(0.02, true, false, true).timeout
		tempo += 0.02
	camera.offset = Vector2.ZERO

func _ao_morrer() -> void:
	print("Jogador morreu — voltando ao início da arena")
	position = Vector2(300, 456)
	vida.vida_atual = vida.vida_maxima
