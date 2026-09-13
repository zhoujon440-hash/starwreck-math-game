extends RefCounted

func run(t) -> void:
	# Artifact preflight is exercised as a real PowerShell process by
	# scripts/tests/godot-review-preflight.test.mjs, not by matching local tooling prose.
	t.equal(ProjectSettings.get_setting("application/config/name"), "星骸拾荒者：十二星门")
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_width"), 1920)
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_height"), 1080)
	var main_scene = load("res://scenes/main/Main.tscn")
	t.truthy(main_scene != null, "main scene must load")
	if main_scene != null:
		var title = main_scene.instantiate()
		t.truthy(title.has_node("SceneBackdrop"), "title must establish the same illustrated world as the playable scene")
		t.truthy(title.has_node("AmbientPulse"), "title needs restrained local animation")
		title.free()
	var scene_json = FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json")
	var data = JSON.parse_string(scene_json)
	t.truthy(data is Dictionary, "scene data must be a dictionary")
	if data is Dictionary:
		t.equal(data.get("scene_id"), "SCN-G01-00")
		t.equal(data["clues"].size(), 7)
		t.equal(data["deductions"].size(), 4)
		t.equal(data.get("forensic_workbench", {}), {
			"burn_baseline_target": [1.0, 2.0, 2.0, 3.0],
			"burn_hold_seconds": 0.65,
			"tape_order_target": [1.0, 0.0, 2.0],
			"tape_positions_target": [2.0, 1.0, 2.0],
			"plate_trace_target": [0.0, 2.0, 3.0, 5.0],
		}, "scene data owns the fixed forensic workbench targets")
		t.equal(data.get("items", [])[0].get("id"), "ITM-G01-001")
		t.equal(data.get("items", [])[1].get("id"), "ITM-G01-002")
		t.equal(data.get("power_panel", {}).get("sequence", []), ["isolate_b", "signal_window_diagnostic", "install_fuse", "align_coupler", "latch_protector"], "scene metadata must place the diagnostic exactly between B isolation and fuse installation")
		var hints: Dictionary = data.get("hints", {})
		var required_hint_keys := [
			"EXPLORE", "INVESTIGATE", "DEDUCTION",
			"DIAGNOSTIC",
			"BURN_BASELINE", "BURN_SCAN", "TAPE_ORDER", "PLATE_TRACE", "SYNTHESIS",
			"ORIGIN", "CALIPER", "BLOCKADE", "WINDOWS", "REPAIR",
			"MAINTENANCE", "WEAK", "KEEP_GATES", "KEEP_FINAL"
		]
		for hint_key in required_hint_keys:
			t.truthy(hints.has(hint_key), "hint data must include Task 6 operation guidance for %s" % hint_key)
			if hints.has(hint_key):
				t.truthy(hints[hint_key] is Array and hints[hint_key].size() == 3, "%s must expose exactly three hint tiers" % hint_key)
		if hints.has("WINDOWS") and hints["WINDOWS"] is Array and hints["WINDOWS"].size() == 3:
			for forbidden_window_spoiler in ["1,5,9", "[1, 5, 9]"]:
				t.truthy(forbidden_window_spoiler not in str(hints["WINDOWS"][2]), "window tier-3 hint must not reveal the exact solved shutters")
		if hints.has("BLOCKADE") and hints["BLOCKADE"] is Array and hints["BLOCKADE"].size() == 3:
			for forbidden_blockade_spoiler in ["0·3·7·8", "0,3,7,8", "[0, 3, 7, 8]"]:
				t.truthy(forbidden_blockade_spoiler not in str(hints["BLOCKADE"][2]), "blockade tier-3 hint must not reveal every occupied slot")
		if hints.has("SYNTHESIS") and hints["SYNTHESIS"] is Array and hints["SYNTHESIS"].size() == 3:
			for forbidden_synthesis_spoiler in ["REV3_STAMP", "AC_PATH", "FUSE_SPEC"]:
				t.truthy(forbidden_synthesis_spoiler not in str(hints["SYNTHESIS"][2]), "synthesis tier-3 hint must not reveal the full plate mapping")
		if hints.has("REPAIR") and hints["REPAIR"] is Array and hints["REPAIR"].size() == 3:
			t.truthy("B隔离" not in str(hints["REPAIR"][2]), "repair tier-3 hint must not restate the full approved order once repair begins")
	var math_data = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00_math.json"))
	t.truthy(math_data is Dictionary, "signal-window configuration must be readable")
	if math_data is Dictionary:
		t.equal(math_data["task_id"], "SCN-G01-00-MATH-01")
		t.equal(math_data["ending_sender"], "UNKNOWN")
	var presets = FileAccess.get_file_as_string("res://export_presets.cfg")
	t.truthy(not presets.contains("platform=\"Web\""), "no Web export preset is added")
	var cockpit_packed = load("res://scenes/g01/SCN_G01_00.tscn")
	t.truthy(cockpit_packed != null, "cockpit scene must load")
	if cockpit_packed != null:
		var cockpit = cockpit_packed.instantiate()
		t.truthy(cockpit.has_node("World/Background"))
		t.truthy(cockpit.has_node("World/Flashlight"))
		t.truthy(cockpit.has_node("World/PowerPanelHotspot"))
		t.truthy(cockpit.has_node("World/PowerPanelWorld/SignalWindowConsole"), "the diagnostic instrument must be embedded in the physical power cabinet")
		var signal_console = cockpit.get_node("World/PowerPanelWorld/SignalWindowConsole")
		t.truthy(signal_console.has_node("CycleDrum/Tape/PhaseScale"), "diagnostic paper tape needs an absolute 12-stop phase frame")
		if signal_console.has_node("CycleDrum/Tape/PhaseScale"):
			t.equal(signal_console.get_node("CycleDrum/Tape/PhaseScale").get_child_count(), 24, "phase frame needs twelve etched ticks and twelve readable labels")
			t.truthy(signal_console.get_node("CycleDrum/Tape/PhaseScale/Number11").get_theme_font_size("font_size") >= 16, "phase labels must remain legible at the 1366 contract")
		var panel_hotspot: Area2D = cockpit.get_node("World/PowerPanelHotspot")
		t.truthy(cockpit.has_node("World/BurnMarkHotspot"), "directional B-branch damage needs its own inspection target")
		t.truthy(panel_hotspot.get_script() == null and not panel_hotspot.is_in_group("inspectables"), "power-panel entrance must not compete with clue inspection input")
		var panel_shape: RectangleShape2D = panel_hotspot.get_node("CollisionShape2D").shape
		var panel_rect := Rect2(panel_hotspot.position - panel_shape.size * 0.5, panel_shape.size)
		for clue_path in ["World/FaultRecordHotspot", "World/CouplerPlateHotspot"]:
			var clue_hotspot: Area2D = cockpit.get_node(clue_path)
			var clue_shape: RectangleShape2D = clue_hotspot.get_node("CollisionShape2D").shape
			var clue_rect := Rect2(clue_hotspot.position - clue_shape.size * 0.5, clue_shape.size)
			t.truthy(not panel_rect.intersects(clue_rect), "%s center and body must remain independent from the power-panel entrance" % clue_path)
		t.truthy(cockpit.has_node("UI/InventoryHud"))
		t.truthy(cockpit.has_node("UI/DeductionBoard/BoardCanvas"))
		t.truthy(cockpit.has_node("UI/DeductionBoard/ObservedClues"))
		t.truthy(cockpit.has_node("UI/EvidenceInspection"), "required cockpit evidence must open a physical inspection close-up")
		for path in ["UI/EvidenceInspection/Workbench/ObservationRail/Detail0", "UI/EvidenceInspection/Workbench/ObservationRail/Detail1", "UI/EvidenceInspection/Workbench/ObservationRail/Detail2", "UI/EvidenceInspection/Workbench/HypothesisRail/Hypothesis0", "UI/EvidenceInspection/Workbench/HypothesisRail/Hypothesis1", "UI/EvidenceInspection/Workbench/HypothesisRail/Hypothesis2", "UI/EvidenceInspection/Workbench/BurnPanel/Baseline0", "UI/EvidenceInspection/Workbench/BurnPanel/Baseline3", "UI/EvidenceInspection/Workbench/BurnPanel/BaselineLock", "UI/EvidenceInspection/Workbench/BurnPanel/HoldMeter", "UI/EvidenceInspection/Workbench/TapePanel/Reel0", "UI/EvidenceInspection/Workbench/TapePanel/Reel2", "UI/EvidenceInspection/Workbench/TapePanel/SwapLeft", "UI/EvidenceInspection/Workbench/TapePanel/SwapRight", "UI/EvidenceInspection/Workbench/TapePanel/RunLever", "UI/EvidenceInspection/Workbench/TapePanel/SeamLight0", "UI/EvidenceInspection/Workbench/TapePanel/SeamLight1", "UI/EvidenceInspection/Workbench/PlatePanel/LatchLeft", "UI/EvidenceInspection/Workbench/PlatePanel/LatchRight", "UI/EvidenceInspection/Workbench/PlatePanel/LiftCover", "UI/EvidenceInspection/Workbench/PlatePanel/TraceNode0", "UI/EvidenceInspection/Workbench/PlatePanel/TraceNode5", "UI/EvidenceInspection/Workbench/PlatePanel/TraceLine", "UI/EvidenceInspection/Workbench/PlatePanel/TraceProbe", "UI/EvidenceInspection/Workbench/RecordEvidence"]:
			t.truthy(cockpit.has_node(path), "evidence close-up is missing a playable control: %s" % path)
		var inspection = cockpit.get_node("UI/EvidenceInspection/Workbench")
		t.equal(inspection.get_node("BurnPanel").position.y, inspection.get_node("TapePanel").position.y, "all evidence mechanisms must share the same readable workbench frame")
		t.equal(inspection.get_node("BurnPanel").position.y, inspection.get_node("PlatePanel").position.y, "all evidence mechanisms must share the same readable workbench frame")
		t.truthy(inspection.get_node("BurnPanel/Baseline0").size.y >= 52.0, "baseline controls must remain comfortably clickable at 1366")
		t.truthy(inspection.get_node("PlatePanel/TraceNode5").size.x >= 54.0, "trace nodes must remain comfortably clickable at 1366")
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld"))
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld/FusePickup"))
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld/OldLabelHotspot"))
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld/RevisionMarkHotspot"))
		var cabinet = cockpit.get_node("World/MaintenanceCabinetWorld")
		t.truthy(cabinet.has_node("FuseLatchLeft") and cabinet.has_node("FuseLatchRight"), "spare fuse must remain behind two physical retaining clips")
		t.truthy(not cabinet.get_node("FusePickup").input_pickable, "spare fuse cannot be taken before both clips release")
		t.truthy(not cabinet.get_node("OldLabelHotspot").input_pickable and not cabinet.get_node("RevisionMarkHotspot").input_pickable, "cabinet evidence begins physically obscured")
		t.truthy(cabinet.get_node("Wrench").position.distance_to(cabinet.get_node("OldLabelHotspot").position) < 140.0, "wrench must visibly cover the old bypass label")
		t.truthy(cabinet.get_node("Glove").position.distance_to(cabinet.get_node("RevisionMarkHotspot").position) < 140.0, "glove must visibly cover the Rev.3 mark")
		for hotspot_path in ["World/BurnMarkHotspot", "World/EmergencyStripHotspot", "World/FaultRecordHotspot", "World/CouplerPlateHotspot", "World/MaintenanceCabinetWorld/OldLabelHotspot", "World/MaintenanceCabinetWorld/RevisionMarkHotspot"]:
			t.truthy(cockpit.has_node(hotspot_path), "required inspection target is missing: %s" % hotspot_path)
			if cockpit.has_node(hotspot_path):
				t.truthy(cockpit.get_node(hotspot_path).has_node("Glow"), "inspectables need restrained world-space hover feedback")
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld/WrenchDistractor"), "cabinet needs story-grounded distractors")
		t.truthy(cockpit.has_node("World/MaintenanceCabinetWorld/GloveDistractor"))
		for path in ["FusePickup/CastShadow", "WrenchShadow", "GloveShadow"]:
			t.truthy(cabinet.has_node(path), "cabinet prop needs contact shadow for scene integration: %s" % path)
		t.truthy(cabinet.get_node("FusePickup/Sprite").scale.x <= 0.36, "fuse must stay proportional to the cabinet compartments")
		t.truthy(cabinet.get_node("Wrench").scale.x <= 0.24, "wrench must not read as a floating sticker")
		t.truthy(cabinet.get_node("Glove").scale.x <= 0.24, "glove must not read as a floating sticker")
		t.truthy(cabinet.get_node("OldLabelHotspot/Sprite").scale.x <= 0.20, "old label must sit inside its storage bin")
		t.truthy(cabinet.get_node("FusePickup/Sprite").modulate.r < 0.9, "cabinet pickups must inherit local low-key lighting")
		t.truthy(cockpit.has_node("UI/CabinetReturn"), "close-up needs an explicit return affordance")
		t.truthy(cockpit.has_node("World/WorldCamera"), "close-ups must use a world camera")
		t.truthy(cockpit.has_node("World/PowerRestoreSequence/LightBandLeft"), "restoration needs staged local lighting")
		t.truthy(cockpit.has_node("World/PowerRestoreSequence/LightBandRight"))
		t.truthy(cockpit.has_node("World/PowerRestoreSequence/NavigationDoorGlow"))
		for band_path in ["World/PowerRestoreSequence/LightBandLeft", "World/PowerRestoreSequence/LightBandRight"]:
			var band: Polygon2D = cockpit.get_node(band_path)
			var lower_edge := 0.0
			var upper_edge := 1080.0
			for point in band.polygon:
				lower_edge = maxf(lower_edge, point.y)
				upper_edge = minf(upper_edge, point.y)
			t.truthy(lower_edge <= 32.0, "restore fixtures must remain thin and never mask the cockpit image")
			t.truthy(lower_edge - upper_edge <= 12.0, "restore fixtures must be narrow local strips, not screen masks")
			t.truthy(band.color.a <= 0.3, "restore fixtures must read as light, not an opaque overlay")
		var door_glow = cockpit.get_node("World/PowerRestoreSequence/NavigationDoorGlow")
		t.truthy(door_glow is Line2D, "navigation wake effect must outline the door instead of masking it")
		var console_wake: Line2D = cockpit.get_node("World/PowerRestoreSequence/ConsoleWake")
		t.truthy(console_wake.width <= 3.0 and console_wake.default_color.a <= 0.3, "console wake trace must remain a restrained local readback")
		t.truthy(cockpit.has_node("UI/ObjectivePanel"), "objective must be readable without a task-list HUD")
		t.truthy(cockpit.has_node("UI/HintDock"), "tiered anti-stuck help must be available")
		t.truthy(cockpit.has_node("UI/DiscoveryToast"), "clue and narrative feedback needs a dedicated treatment")
		t.truthy(cockpit.has_node("UI/InventoryHud/Margin/ItemSlots"), "inventory must expose draggable item slots")
		var board = cockpit.get_node("UI/DeductionBoard")
		t.truthy(board.z_index >= 50, "deduction workbench must render above the scene HUD")
		t.truthy(board.has_node("WorkbenchFrame"), "deduction UI must read as an in-world maintenance workbench")
		for path in ["WorkbenchSurface", "BenchWear", "ClampLeft", "ClampRight", "EvidenceTray", "BoardCanvas/Grid", "LogicReadout/ReadoutLamp"]:
			t.truthy(board.has_node(path), "deduction workbench is missing physical layer: %s" % path)
		t.truthy(board.has_node("LogicReadout"), "board must explain outcomes without revealing answers")
		t.truthy(board.has_node("BoardCanvas/Connections"), "accepted evidence relations need a dedicated visible line layer")
		t.truthy(board.has_node("Analyze"), "the first deduction must require an intentional analysis action")
		t.equal(board.get_node("RelationSelector").get_child_count(), 3, "relation selector must expose exactly three neutral choices")
		cockpit.free()
