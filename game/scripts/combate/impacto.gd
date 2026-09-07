extends Node

## Autoload (singleton "Impacto", registrado em project.godot). Dá uma pausa
## curtíssima no jogo a cada acerto — o "hit-stop" que Hollow Knight, Celeste
## e quase todo jogo de ação usa pra fazer o dano parecer que aconteceu de
## verdade, mesmo sem animação de impacto de verdade ainda.

var _ativo := false

func pausa_curta(duracao: float = 0.06, escala: float = 0.05) -> void:
	if _ativo:
		return
	_ativo = true
	Engine.time_scale = escala
	# ignore_time_scale=true, senão essa própria espera ficaria 20x mais
	# longa por causa do time_scale que acabamos de baixar.
	await get_tree().create_timer(duracao, true, false, true).timeout
	Engine.time_scale = 1.0
	_ativo = false
