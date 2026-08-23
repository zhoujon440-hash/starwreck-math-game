class_name GameState
extends RefCounted

const SCHEMA_VERSION := 1

var schema_version := SCHEMA_VERSION
var scene_id := "SCN-G01-00"
var scene_phase := "EXPLORE"
var inventory_item_ids: Array[String] = []
var observed_clue_ids: Array[String] = []
var deduction_edges: Array[Dictionary] = []
var unlocked_deduction_ids: Array[String] = []
var installed_item_ids: Array[String] = []
var device_state := {
	"b_isolated": false,
	"fuse_installed": false,
	"coupler_angle": 0.0,
	"protector_on": false,
}
var world_state := "BLACKOUT"
var elapsed_seconds := 0.0

func snapshot() -> Dictionary:
	return {
		"schema_version": schema_version,
		"scene_id": scene_id,
		"scene_phase": scene_phase,
		"inventory_item_ids": inventory_item_ids.duplicate(),
		"observed_clue_ids": observed_clue_ids.duplicate(),
		"deduction_edges": deduction_edges.duplicate(true),
		"unlocked_deduction_ids": unlocked_deduction_ids.duplicate(),
		"installed_item_ids": installed_item_ids.duplicate(),
		"device_state": device_state.duplicate(true),
		"world_state": world_state,
		"elapsed_seconds": elapsed_seconds,
	}

func restore(data: Dictionary) -> bool:
	if data.get("schema_version") != SCHEMA_VERSION or not data.has("scene_id"):
		return false
	schema_version = SCHEMA_VERSION
	scene_id = str(data.get("scene_id", "SCN-G01-00"))
	scene_phase = str(data.get("scene_phase", "EXPLORE"))
	_assign_strings(inventory_item_ids, data.get("inventory_item_ids", []))
	_assign_strings(observed_clue_ids, data.get("observed_clue_ids", []))
	deduction_edges.clear()
	for edge in data.get("deduction_edges", []):
		if edge is Dictionary:
			deduction_edges.append(edge.duplicate(true))
	_assign_strings(unlocked_deduction_ids, data.get("unlocked_deduction_ids", []))
	_assign_strings(installed_item_ids, data.get("installed_item_ids", []))
	var restored_device = data.get("device_state", {})
	if restored_device is Dictionary:
		for key in device_state.keys():
			if restored_device.has(key):
				device_state[key] = restored_device[key]
	world_state = str(data.get("world_state", "BLACKOUT"))
	elapsed_seconds = float(data.get("elapsed_seconds", 0.0))
	return true

func _assign_strings(target: Array[String], source: Variant) -> void:
	target.clear()
	if source is Array:
		for value in source:
			target.append(str(value))

