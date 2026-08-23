extends RefCounted

const SAVE_PATH := "user://test_save_01.json"

func run(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.scene_phase = "REPAIR"
	state.observed_clue_ids.assign(["CLUE-001", "CLUE-004"])
	var service = preload("res://scripts/core/SaveService.gd").new(SAVE_PATH)
	_cleanup()
	t.equal(service.save_state(state), OK)
	var loaded = service.load_state()
	t.equal(loaded.get("scene_phase"), "REPAIR")
	t.equal(loaded.get("observed_clue_ids"), ["CLUE-001", "CLUE-004"])
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	file.store_string("{broken")
	file.close()
	t.equal(service.load_state(), {}, "corrupt save must recover safely")
	_cleanup()

func _cleanup() -> void:
	for path in [SAVE_PATH, SAVE_PATH.replace(".json", ".tmp")]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

