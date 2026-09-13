class_name SaveService
extends RefCounted

var save_path := "user://save_01.json"

func _init(path := "user://save_01.json") -> void:
	save_path = path

func save_state(state: RefCounted) -> Error:
	var temp_path = save_path.replace(".json", ".tmp")
	var file = FileAccess.open(temp_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(state.snapshot()))
	file.flush()
	file.close()
	var target_absolute = ProjectSettings.globalize_path(save_path)
	var temp_absolute = ProjectSettings.globalize_path(temp_path)
	if FileAccess.file_exists(save_path):
		var remove_error = DirAccess.remove_absolute(target_absolute)
		if remove_error != OK:
			return remove_error
	return DirAccess.rename_absolute(temp_absolute, target_absolute)

func load_state() -> Dictionary:
	var inspection = inspect_state()
	return inspection.get("data", {}) if inspection.get("valid", false) else {}

func inspect_state() -> Dictionary:
	if not FileAccess.file_exists(save_path):
		return {"exists": false, "valid": false, "data": {}, "reason": "missing"}
	var parser = JSON.new()
	if parser.parse(FileAccess.get_file_as_string(save_path)) != OK or not parser.data is Dictionary:
		return {"exists": true, "valid": false, "data": {}, "reason": "corrupt_json"}
	var candidate = preload("res://scripts/core/GameState.gd").new()
	if not candidate.restore(parser.data) or candidate.scene_id != "SCN-G01-00":
		return {"exists": true, "valid": false, "data": {}, "reason": "unsupported_state"}
	return {"exists": true, "valid": true, "data": candidate.snapshot(), "reason": ""}

func delete_save() -> Error:
	if not FileAccess.file_exists(save_path):
		return OK
	return DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))

