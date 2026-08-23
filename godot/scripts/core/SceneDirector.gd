class_name SceneDirector
extends Node

signal overwrite_confirmation_required

static var pending_snapshot: Dictionary = {}
const FLOW := {
	"EXPLORE": "INVESTIGATE",
	"INVESTIGATE": "DEDUCTION",
	"DEDUCTION": "REPAIR",
	"REPAIR": "POWER_RESTORED",
	"POWER_RESTORED": "SLICE_COMPLETE",
}

var state = preload("res://scripts/core/GameState.gd").new()
var save_service = preload("res://scripts/core/SaveService.gd").new()

func start_new_game(confirmed := true) -> void:
	if FileAccess.file_exists("user://save_01.json") and not confirmed:
		overwrite_confirmation_required.emit()
		return
	save_service.delete_save()
	state = preload("res://scripts/core/GameState.gd").new()
	pending_snapshot = state.snapshot()
	_load_slice()

func resume_game() -> void:
	var data = save_service.load_state()
	state = preload("res://scripts/core/GameState.gd").new()
	if not state.restore(data):
		return
	pending_snapshot = state.snapshot()
	_load_slice()

func advance_phase(target: String) -> bool:
	if FLOW.get(state.scene_phase, "") != target:
		return false
	state.scene_phase = target
	return true

func next_scene_marker() -> String:
	return "SCN-G01-01-TEASER" if state.scene_phase == "SLICE_COMPLETE" else ""

static func take_pending_snapshot() -> Dictionary:
	var snapshot = pending_snapshot.duplicate(true)
	pending_snapshot = {}
	return snapshot

func _load_slice() -> void:
	if is_inside_tree():
		get_tree().change_scene_to_file("res://scenes/g01/SCN_G01_00.tscn")

