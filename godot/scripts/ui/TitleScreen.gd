class_name TitleScreen
extends Control

signal new_game_requested
signal continue_requested

func _on_new_game_pressed() -> void:
	new_game_requested.emit()

func _on_continue_pressed() -> void:
	continue_requested.emit()

