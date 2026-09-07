extends Node
class_name Vida

## Vida, dano e invulnerabilidade compartilhados por jogador, inimigo e
## boneco de treino. Os sinais avisam quem estiver ouvindo (flash visual,
## morte) sem acoplar este componente a como cada um reage.

signal dano_recebido(quantidade: int)
signal morreu

@export var vida_maxima: int = 100
@export var duracao_invulneravel: float = 0.5

var vida_atual: int
var invulneravel: bool = false

func _ready() -> void:
	vida_atual = vida_maxima

func receber_dano(quantidade: int) -> void:
	if invulneravel or vida_atual <= 0:
		return
	vida_atual = max(0, vida_atual - quantidade)
	dano_recebido.emit(quantidade)
	if vida_atual == 0:
		morreu.emit()
		return
	_ativar_invulnerabilidade()

func _ativar_invulnerabilidade() -> void:
	invulneravel = true
	await get_tree().create_timer(duracao_invulneravel).timeout
	invulneravel = false
