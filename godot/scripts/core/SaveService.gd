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
	if not FileAccess.file_exists(save_path):
		return {}
	var parser = JSON.new()
	if parser.parse(FileAccess.get_file_as_string(save_path)) != OK:
		return {}
	return parser.data if parser.data is Dictionary else {}

func delete_save() -> Error:
	if not FileAccess.file_exists(save_path):
		return OK
	return DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))

