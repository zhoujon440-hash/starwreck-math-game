extends RefCounted

func run(t) -> void:
	t.equal(ProjectSettings.get_setting("application/config/name"), "星骸拾荒者：十二星门")
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_width"), 1920)
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_height"), 1080)
	var main_scene = load("res://scenes/main/Main.tscn")
	t.truthy(main_scene != null, "main scene must load")
	var scene_json = FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json")
	var data = JSON.parse_string(scene_json)
	t.truthy(data is Dictionary, "scene data must be a dictionary")
	if data is Dictionary:
		t.equal(data.get("scene_id"), "SCN-G01-00")
		t.equal(data.get("clues", []).size(), 7)
		t.equal(data.get("deductions", []).size(), 4)
		t.equal(data.get("items", [])[0].get("id"), "ITM-G01-001")
		t.equal(data.get("items", [])[1].get("id"), "ITM-G01-002")
	var cockpit_packed = load("res://scenes/g01/SCN_G01_00.tscn")
	t.truthy(cockpit_packed != null, "cockpit scene must load")
	if cockpit_packed != null:
		var cockpit = cockpit_packed.instantiate()
		t.truthy(cockpit.has_node("World/Background"))
		t.truthy(cockpit.has_node("World/Flashlight"))
		t.truthy(cockpit.has_node("World/PowerPanelHotspot"))
		t.truthy(cockpit.has_node("UI/InventoryHud"))
		t.truthy(cockpit.has_node("UI/DeductionBoard/BoardCanvas"))
		t.truthy(cockpit.has_node("UI/DeductionBoard/ObservedClues"))
		cockpit.free()

