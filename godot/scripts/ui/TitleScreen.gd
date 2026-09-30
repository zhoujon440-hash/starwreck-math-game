class_name TitleScreen
extends Control

signal new_game_requested
signal continue_requested

var ambient_clock := 0.0
var save_service = preload("res://scripts/core/SaveService.gd").new()

func _ready() -> void:
	_refresh_continue_state()
	$TitleLayout/NewGame.grab_focus()

func _refresh_continue_state() -> void:
	var inspection = save_service.inspect_state()
	$TitleLayout/Continue.disabled = not inspection.get("valid", false)
	$TitleLayout/SaveNotice.visible = inspection.get("exists", false) and not inspection.get("valid", false)
	$TitleLayout/SaveNotice.text = "调查记录已损坏，无法继续。请选择“新游戏”重建本关记录。" if $TitleLayout/SaveNotice.visible else ""

func _process(delta: float) -> void:
	ambient_clock += delta
	$AmbientPulse.modulate.a = 0.54 + sin(ambient_clock * 1.55) * 0.28
	$SceneBackdrop.position.x = sin(ambient_clock * 0.12) * 4.0

func _on_new_game_pressed() -> void:
	if FileAccess.file_exists(save_service.save_path):
		$OverwriteConfirm.popup_centered()
	else:
		new_game_requested.emit()

func _on_continue_pressed() -> void:
	_refresh_continue_state()
	if $TitleLayout/Continue.disabled:
		return
	continue_requested.emit()

func _on_overwrite_confirmed() -> void:
	new_game_requested.emit()
