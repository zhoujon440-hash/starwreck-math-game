class_name SceneDirector
extends Node

var state = preload("res://scripts/core/GameState.gd").new()
var save_service = preload("res://scripts/core/SaveService.gd").new()

func start_new_game() -> void:
	state = preload("res://scripts/core/GameState.gd").new()
	get_tree().change_scene_to_file("res://scenes/g01/SCN_G01_00.tscn")

func resume_game() -> void:
	var data = save_service.load_state()
	state = preload("res://scripts/core/GameState.gd").new()
	state.restore(data)
	get_tree().change_scene_to_file("res://scenes/g01/SCN_G01_00.tscn")

