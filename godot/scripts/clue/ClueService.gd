class_name ClueService
extends RefCounted

signal clue_observed(clue_id: String)

var state: RefCounted
var valid_ids: Array[String] = []

func _init(game_state: RefCounted) -> void:
	state = game_state
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if data is Dictionary:
		for clue in data.get("clues", []):
			valid_ids.append(str(clue.get("id")))

func observe(clue_id: String) -> bool:
	if clue_id not in valid_ids or clue_id in state.observed_clue_ids:
		return false
	state.observed_clue_ids.append(clue_id)
	clue_observed.emit(clue_id)
	return true

