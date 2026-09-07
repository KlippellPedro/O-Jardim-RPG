extends Node2D

## Balanço simples de "respiração" pro visual do personagem. Provisório —
## quando o rig ganhar partes articuladas de verdade (braço, perna), isso
## vira animação de AnimationPlayer de verdade (idle/correr/atacar). Por
## enquanto é só o corpo inteiro subindo e descendo, pra não parecer um
## boneco parado.

@export var amplitude: float = 2.0
@export var velocidade: float = 3.0

var _tempo := 0.0
var _posicao_base: Vector2

func _ready() -> void:
	_posicao_base = position

func _process(delta: float) -> void:
	_tempo += delta * velocidade
	position = _posicao_base + Vector2(0, sin(_tempo) * amplitude)
