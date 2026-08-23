class_name TitleScreen
extends Control

signal new_game_requested
signal continue_requested

func _on_new_game_pressed() -> void:
	if FileAccess.file_exists("user://save_01.json"):
		$OverwriteConfirm.popup_centered()
	else:
		new_game_requested.emit()

func _on_continue_pressed() -> void:
	continue_requested.emit()

func _on_overwrite_confirmed() -> void:
	new_game_requested.emit()

