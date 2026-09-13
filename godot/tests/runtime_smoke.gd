extends SceneTree

const SMOKE_SAVE := "user://runtime_smoke.json"
var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	_cleanup()
	var packed = load("res://scenes/g01/SCN_G01_00.tscn")
	_require(packed != null, "scene must load")
	if packed == null:
		_finish()
		return
	var scene = packed.instantiate()
	root.add_child(scene)
	await process_frame
	for contract_size in [Vector2i(1920, 1080), Vector2i(1366, 768)]:
		root.size = contract_size
		await process_frame
		_require(root.size == contract_size, "runtime window accepts the %dx%d display contract" % [contract_size.x, contract_size.y])
		_require(ProjectSettings.get_setting("display/window/stretch/mode") == "canvas_items", "scene scales as native canvas content at both target resolutions")
	root.size = Vector2i(1920, 1080)
	_require(scene.incident_brief.visible, "clean save opens with the Chapter 12-to-13 incident brief")
	_require(scene.get_node("UI/IncidentBrief/Text").text.contains("准予远航") and scene.get_node("UI/IncidentBrief/Text").text.contains("封锁光网"), "opening brief renders certification and blockade impact")
	scene.save_service = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE)
	_require(scene.inventory_service.acquire("ITM-G01-001"), "flashlight acquisition")
	scene.flashlight.set_active(true)
	scene._on_clue_observed("CLUE-001")
	var inspection = scene.get_node("UI/EvidenceInspection")
	_require(inspection.state == scene.state and inspection.mechanics != null, "scene injects its state and mechanics into the live forensic close-up")
	var authored_forensic: Dictionary = scene.scene_data.get("forensic_workbench", {})
	_require(inspection.forensic_config.size() == authored_forensic.size(), "normalization preserves every authored forensic field")
	for key in authored_forensic:
		if authored_forensic[key] is Array:
			var actual_ids: Array = inspection.forensic_config.get(key, [])
			_require(actual_ids.size() == authored_forensic[key].size(), "%s preserves the authored array length" % key)
			for index in mini(actual_ids.size(), authored_forensic[key].size()):
				_require(actual_ids[index] is int and actual_ids[index] == int(authored_forensic[key][index]), "%s preserves each numeric ID as an integer" % key)
		else:
			_require(inspection.forensic_config.get(key) == authored_forensic[key], "%s preserves the authored scalar" % key)
	if inspection.state == scene.state and inspection.mechanics != null:
		await _open_evidence(scene, "CLUE-002")
		for detail in 3:
			inspection._on_observation_detail(detail)
		inspection._on_hypothesis(1)
		_require(scene.current_objective_text() == "调平四段热层基线，再锁住烧蚀扫描参考带", "burn close-up objective narrows to the baseline lock before scanning")
		for segment in 4:
			for _step in int([1, 2, 2, 3][segment]):
				inspection._on_baseline_adjust(segment)
		inspection._on_baseline_lock()
		_require(scene.current_objective_text() == "沿四个方向稳定复扫烧蚀切口，确认冲击由外向内", "burn objective advances to the directional scan after the baseline locks")
		await _require_modal_guidance(scene, "沿四个方向稳定复扫烧蚀切口，确认冲击由外向内", "BURN_SCAN", "burn close-up")
		var cockpit_fault_hotspot: Area2D = scene.get_node("World/FaultRecordHotspot")
		_require(not cockpit_fault_hotspot.input_pickable, "burn close-up exclusively owns overlapping cockpit input")
		var burn_before: int = scene.state.investigation_state["burn_scan_points"].size()
		var scan0_center: Vector2 = inspection.get_node("Workbench/BurnPanel/Scan0").get_global_rect().get_center()
		await _viewport_click(scan0_center, MOUSE_BUTTON_LEFT)
		_require(scene.state.investigation_state["burn_scan_points"].size() == burn_before, "one physical burn click only arms the next direction point")
		_require(int(scene.state.investigation_state.get("burn_active_point", -1)) == 0, "the first physical burn click stores the armed scan head")
		_require(inspection.visible and scene.state.current_view == "EVIDENCE", "burn arming cannot activate the overlapping tape hotspot")
		await create_timer(0.72).timeout
		_require(scene.state.investigation_state["burn_scan_points"].size() == burn_before, "waiting longer than the old burn hold threshold still must not auto-confirm an armed point")
		_require(int(scene.state.investigation_state.get("burn_active_point", -1)) == 0, "armed burn scan remains pending after the legacy hold duration passes")
		_require(not inspection.get_node("Workbench/RecordEvidence").visible, "armed burn scan cannot expose evidence recording before the second click")
		_require(scene.save_service.save_state(scene.state) == OK, "armed burn scan writes to the smoke save")
		var burn_resumed = await _resume_scene(packed, preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state())
		var burn_resumed_inspection = burn_resumed.get_node("UI/EvidenceInspection")
		_require(burn_resumed.state.current_view == "EVIDENCE" and burn_resumed_inspection.visible, "disk resume restores the active burn close-up")
		_require(not burn_resumed.get_node("World/FaultRecordHotspot").input_pickable, "resumed burn close-up keeps exclusive cockpit input")
		await _require_modal_guidance(burn_resumed, "沿四个方向稳定复扫烧蚀切口，确认冲击由外向内", "BURN_SCAN", "resumed burn close-up")
		await _viewport_click(burn_resumed_inspection.get_node("Workbench/BurnPanel/Scan0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(burn_resumed.state.investigation_state["burn_scan_points"].size() == burn_before + 1, "second physical burn click confirms exactly one armed direction point")
		_require(int(burn_resumed.state.investigation_state.get("burn_active_point", -1)) == -1, "confirmed burn scan clears the armed scan head")
		scene.queue_free()
		scene = burn_resumed
		inspection = burn_resumed_inspection
		for _frame in 4:
			await process_frame
		for point in 4:
			if point > 0:
				var scan_center: Vector2 = inspection.get_node("Workbench/BurnPanel/Scan%d" % point).get_global_rect().get_center()
				await _viewport_click(scan_center, MOUSE_BUTTON_LEFT)
				await _viewport_click(scan_center, MOUSE_BUTTON_LEFT)
		inspection._refresh_controls()
		_require(inspection.get_node("Workbench/RecordEvidence").visible, "completed burn scan requires an explicit record action")
		_require("CLUE-002" not in scene.state.observed_clue_ids, "burn completion does not award its clue before RecordEvidence")
		inspection._on_record_pressed()
		await _open_evidence(scene, "CLUE-003")
		for detail in 3:
			inspection._on_observation_detail(detail)
		inspection._on_hypothesis(2)
		await _viewport_click(inspection.get_node("Workbench/TapePanel/Reel0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(scene.state.investigation_state["tape_positions"] == [1, 0, 0], "one physical reel rotation persists before crossing a seam")
		var tape_order_before: Array = scene.state.investigation_state["tape_order"].duplicate()
		var rotated_reel_trace: PackedVector2Array = inspection.get_node("Workbench/TapePanel/Reel0/SurgeTrace").points.duplicate()
		var unrotated_reel_trace: PackedVector2Array = inspection.get_node("Workbench/TapePanel/Reel1/SurgeTrace").points.duplicate()
		await _viewport_click(inspection.get_node("Workbench/TapePanel/SwapLeft").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(tape_order_before == [0, 1, 2] and scene.state.investigation_state["tape_order"] == [1, 0, 2], "one physical adjacent swap advances tape order exactly once")
		_require(scene.state.investigation_state["tape_positions"] == [0, 1, 0], "a physical adjacent swap carries the rotated face with its reel")
		_require(inspection.get_node("Workbench/TapePanel/Reel0/TimeMark").text == "卷 B · 00:01" and inspection.get_node("Workbench/TapePanel/Reel0/SurgeTrace").points == unrotated_reel_trace, "the left tape control carries reel B's timestamp and unrotated physical trace")
		_require(inspection.get_node("Workbench/TapePanel/Reel1/TimeMark").text == "卷 A · 00:02" and inspection.get_node("Workbench/TapePanel/Reel1/SurgeTrace").points == rotated_reel_trace, "the middle tape control carries reel A's timestamp and rotated physical trace")
		_require(not scene.get_node("World/FaultRecordHotspot").input_pickable and scene.state.current_view == "EVIDENCE", "tape gesture cannot activate its overlapping cockpit hotspot")
		_require(scene.save_service.save_state(scene.state) == OK, "partial tape order writes to the smoke save")
		var tape_resumed = await _resume_scene(packed, preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state())
		var tape_resumed_inspection = tape_resumed.get_node("UI/EvidenceInspection")
		_require(tape_resumed.state.current_view == "EVIDENCE" and tape_resumed_inspection.visible, "disk resume restores the active tape close-up")
		_require(not tape_resumed.get_node("World/FaultRecordHotspot").input_pickable, "resumed tape close-up keeps exclusive cockpit input")
		var reel_before := int(tape_resumed.state.investigation_state["tape_positions"][0])
		await _viewport_click(tape_resumed_inspection.get_node("Workbench/TapePanel/Reel0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(int(tape_resumed.state.investigation_state["tape_positions"][0]) == (reel_before + 1) % 3, "resumed tape gesture rotates one reel exactly once")
		tape_resumed.queue_free()
		for _frame in 4:
			await process_frame
		for _step in 2:
			inspection._on_tape_reel(0)
		for _step in 2:
			inspection._on_tape_reel(2)
		inspection._on_tape_run()
		_require("CLUE-003" not in scene.state.observed_clue_ids, "verified tape run does not award its clue before RecordEvidence")
		inspection._on_record_pressed()
		await _open_evidence(scene, "CLUE-004")
		for detail in 3:
			inspection._on_observation_detail(detail)
		inspection._on_hypothesis(0)
		inspection._on_plate_latch(0)
		inspection._on_plate_latch(1)
		_require(not scene.state.investigation_state["plate_cover_lifted"], "released latches do not silently lift the revision cover")
		_require(inspection.get_node("Workbench/PlatePanel/TraceNode0").disabled, "the real trace control stays gated until the cover is physically lifted")
		await _viewport_click(inspection.get_node("Workbench/PlatePanel/TraceNode0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(scene.state.investigation_state["plate_trace_nodes"].is_empty(), "a real pre-lift viewport gesture cannot bypass the revision cover")
		_require(inspection.visible and scene.state.current_view == "EVIDENCE", "a blocked pre-lift probe cannot activate the underlying cockpit hotspot")
		await _viewport_click(inspection.get_node("Workbench/PlatePanel/LiftCover").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(scene.state.investigation_state["plate_cover_lifted"], "the real lift control persists the exposed plate state")
		_require(inspection.get_node("Workbench/PlatePanel/LiftCover").text.contains("已抬起"), "the live workbench shows the lifted cover state")
		_require(inspection.get_node("Workbench/PlatePanel/Plate").modulate.a < 0.5, "lifting the cover visibly exposes the plate beneath it")
		var trace_before: int = scene.state.investigation_state["plate_trace_nodes"].size()
		await _viewport_click(inspection.get_node("Workbench/PlatePanel/TraceNode0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(scene.state.investigation_state["plate_trace_nodes"].size() == trace_before + 1, "one physical probe gesture confirms exactly one plate node")
		_require(not scene.get_node("World/FaultRecordHotspot").input_pickable and scene.state.current_view == "EVIDENCE", "plate gesture cannot activate an overlapping cockpit hotspot")
		_require(scene.save_service.save_state(scene.state) == OK, "partial plate trace writes to the smoke save")
		var plate_resumed = await _resume_scene(packed, preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state())
		var plate_resumed_inspection = plate_resumed.get_node("UI/EvidenceInspection")
		_require(plate_resumed.state.current_view == "EVIDENCE" and plate_resumed_inspection.visible, "disk resume restores the active plate close-up")
		_require(plate_resumed.state.investigation_state["plate_cover_lifted"] and plate_resumed_inspection.get_node("Workbench/PlatePanel/LiftCover").text.contains("已抬起"), "disk resume restores the lifted cover state and its control copy")
		_require(plate_resumed_inspection.get_node("Workbench/PlatePanel/Plate").modulate.a < 0.5, "disk resume restores the visibly exposed trace plate")
		_require(not plate_resumed.get_node("World/FaultRecordHotspot").input_pickable, "resumed plate close-up keeps exclusive cockpit input")
		await _viewport_click(plate_resumed_inspection.get_node("Workbench/PlatePanel/TraceNode2").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		_require(plate_resumed.state.investigation_state["plate_trace_nodes"] == [0, 2], "resumed plate gesture continues the preserved route exactly once")
		plate_resumed.queue_free()
		for _frame in 4:
			await process_frame
		inspection._on_trace_node(2)
		inspection._on_trace_node(3)
		inspection._on_trace_node(5)
		_require("CLUE-004" not in scene.state.observed_clue_ids, "completed plate trace does not award its clue before RecordEvidence")
		inspection._on_record_pressed()
		_require(scene.state.observed_clue_ids.size() == 4, "three physical operations add exactly their three existing clues after explicit recording")
	else:
		for clue_id in ["CLUE-002", "CLUE-003", "CLUE-004"]:
			scene._on_clue_observed(clue_id)
	_require(scene.get_node("World/MaintenanceCabinetWorld/OldLabelHotspot").flashlight == scene.flashlight, "resume instances cannot steal the original scene's inspectable ownership")
	_require(scene.get_node("World/MaintenanceCabinetWorld/RevisionMarkHotspot").flashlight == scene.flashlight, "each cabinet clue remains bound to its own scene flashlight")
	# The cabinet is not a single pickup hotspot: two scene-scaled props conceal
	# the labels and fuse holder, then two separate clips retain the fuse.
	for hud_path in ["UI/ObjectivePanel", "UI/StatusStrip", "UI/HintDock", "UI/BoardButton", "UI/InventoryHud"]:
		scene.get_node(hud_path).visible = true
	scene.discovery_toast.visible = true
	scene._enter_cabinet()
	await create_timer(0.45).timeout
	_require(scene.cabinet_world.visible, "cabinet close-up opens for physical inspection")
	_require(not scene.get_node("UI/ObjectivePanel").visible, "cabinet close-up hides the objective panel")
	_require(not scene.get_node("UI/StatusStrip").visible, "cabinet close-up hides the status strip")
	_require(not scene.get_node("UI/HintDock").visible, "cabinet close-up hides the hint action")
	_require(not scene.get_node("UI/BoardButton").visible, "cabinet close-up hides the deduction-board action")
	_require(not scene.get_node("UI/InventoryHud").visible, "cabinet close-up hides the inventory HUD")
	_require(not scene.discovery_toast.visible, "cabinet close-up clears stale toast feedback")
	scene._toast("late cabinet overlay must be rejected")
	_require(not scene.discovery_toast.visible, "cabinet close-up rejects late toast or hint click-through")
	var cabinet_click = InputEventMouseButton.new()
	cabinet_click.button_index = MOUSE_BUTTON_LEFT
	cabinet_click.pressed = true
	scene._on_cabinet_obstruction_input(null, cabinet_click, 0, "wrench")
	_require("ITM-G01-003" in scene.state.inventory_item_ids, "moving the wrench acquires the old wrench exactly once")
	scene._on_cabinet_obstruction_input(null, cabinet_click, 0, "wrench")
	_require(scene.state.inventory_item_ids.count("ITM-G01-003") == 1, "duplicate wrench clicks do not duplicate the tool inventory")
	_require(scene.cabinet_world.get_node("OldLabelHotspot").input_pickable, "moving the wrench exposes the old bypass label")
	scene.flashlight.global_position = scene.cabinet_world.get_node("OldLabelHotspot").global_position
	scene.cabinet_world.get_node("OldLabelHotspot")._input_event(null, cabinet_click, 0)
	scene._on_cabinet_obstruction_input(null, cabinet_click, 0, "glove")
	_require("ITM-G01-004" in scene.state.inventory_item_ids, "moving the gloves acquires the insulating gloves exactly once")
	scene._on_cabinet_obstruction_input(null, cabinet_click, 0, "glove")
	_require(scene.state.inventory_item_ids.count("ITM-G01-004") == 1, "duplicate glove clicks do not duplicate the tool inventory")
	_require("ITM-G01-003" in scene.state.inventory_item_ids and "ITM-G01-004" in scene.state.inventory_item_ids, "both required diagnostic tools remain non-consumable cabinet inventory")
	_require(scene.cabinet_world.get_node("RevisionMarkHotspot").input_pickable, "moving the glove exposes the Rev.3 cancellation mark")
	scene.flashlight.global_position = scene.cabinet_world.get_node("RevisionMarkHotspot").global_position
	scene.cabinet_world.get_node("RevisionMarkHotspot")._input_event(null, cabinet_click, 0)
	scene._on_fuse_latch_input(null, cabinet_click, 0, 0)
	_require(not scene.fuse_pickup.input_pickable, "one released retaining clip cannot expose the fuse pickup")
	scene._on_fuse_latch_input(null, cabinet_click, 0, 1)
	_require(scene.fuse_pickup.input_pickable, "both released retaining clips expose the fuse pickup")
	scene._on_fuse_input(null, cabinet_click, 0)
	_require("ITM-G01-002" in scene.state.inventory_item_ids, "released spare fuse enters inventory")
	_require(scene.state.observed_clue_ids.size() == 7, "all seven clues recorded: %s" % str(scene.state.observed_clue_ids))
	scene._leave_cabinet()
	_require(scene.get_node("UI/ObjectivePanel").visible and scene.get_node("UI/StatusStrip").visible, "closing the cabinet restores exploration readouts")
	_require(scene.get_node("UI/HintDock").visible and scene.get_node("UI/BoardButton").visible, "closing the cabinet restores exploration actions")
	_require(scene.get_node("UI/InventoryHud").visible, "closing the cabinet restores the inventory HUD")
	_require(not scene.discovery_toast.visible, "closing the cabinet does not resurrect stale overlay feedback")
	_require("ITM-G01-003" in scene.state.inventory_item_ids and "ITM-G01-004" in scene.state.inventory_item_ids, "cabinet tools persist after the close-up closes")
	scene._enter_cabinet()
	await create_timer(0.45).timeout
	_require(scene.cabinet_world.visible and not scene.get_node("UI/ObjectivePanel").visible and not scene.inventory_hud.visible, "reopened cabinet keeps every exploration HUD surface suppressed")
	scene._toast("late toast after cabinet reopen")
	_require(not scene.discovery_toast.visible, "reopened cabinet rejects late toast overlays")
	_require(scene.cabinet_world.get_node("OldLabelHotspot").input_pickable and scene.cabinet_world.get_node("RevisionMarkHotspot").input_pickable, "reopened cabinet preserves both exposed clue hotspots")
	_require(not scene.fuse_pickup.visible, "reopened cabinet preserves the collected fuse visual state")
	_require(not scene.fuse_pickup.input_pickable, "reopened cabinet preserves the released-latch interaction state")
	_require(scene.save_service.save_state(scene.state) == OK, "open cabinet state writes to the smoke save")
	var cabinet_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	SceneDirector.pending_snapshot = cabinet_snapshot
	var cabinet_resumed = packed.instantiate()
	root.add_child(cabinet_resumed)
	await process_frame
	_require(cabinet_resumed.state.current_view == "CABINET" and cabinet_resumed.cabinet_world.visible, "disk resume restores the active cabinet close-up")
	_require(not cabinet_resumed.get_node("UI/ObjectivePanel").visible and not cabinet_resumed.get_node("UI/StatusStrip").visible, "cabinet resume suppresses exploration readouts")
	_require(not cabinet_resumed.get_node("UI/HintDock").visible and not cabinet_resumed.get_node("UI/BoardButton").visible and not cabinet_resumed.inventory_hud.visible, "cabinet resume suppresses hint, board, and inventory")
	cabinet_resumed._toast("late toast after cabinet disk resume")
	_require(not cabinet_resumed.discovery_toast.visible, "cabinet resume rejects late toast overlays")
	cabinet_resumed._leave_cabinet()
	_require(cabinet_resumed.get_node("UI/ObjectivePanel").visible and cabinet_resumed.get_node("UI/StatusStrip").visible and cabinet_resumed.get_node("UI/HintDock").visible and cabinet_resumed.get_node("UI/BoardButton").visible and cabinet_resumed.inventory_hud.visible, "closing a restored cabinet returns the exploration HUD")
	cabinet_resumed.queue_free()
	for _frame in 12:
		await process_frame
	scene._leave_cabinet()
	scene.state.elapsed_seconds = 119.95
	scene.state.last_progress_elapsed_seconds = 0.0
	scene.deduction_board.open_board()
	await create_timer(0.2).timeout
	_require(not scene.hint_service.current_hint().is_empty(), "deduction-board pause still advances anti-stuck time")
	scene.deduction_board.close_board()
	scene.hint_service.mark_progress()
	scene.deduction_board.selected_from = "CLUE-002"
	scene.deduction_board.selected_to = "CLUE-004"
	scene.deduction_board._on_relation_selected("contradicts")
	var rejected_lines_now := 0
	for child in scene.deduction_board.get_node("BoardCanvas/Connections").get_children():
		if child.name.begins_with("RejectedDash"):
			rejected_lines_now += 1
	_require(rejected_lines_now >= 3, "rejected board relation flashes a visible red dashed connection")
	await create_timer(0.6).timeout
	var rejected_lines_later := 0
	for child in scene.deduction_board.get_node("BoardCanvas/Connections").get_children():
		if child.name.begins_with("RejectedDash"):
			rejected_lines_later += 1
	_require(rejected_lines_later == 0, "rejected dashed connection removes itself after feedback")
	_require(scene.deduction_graph.analyze_clue("CLUE-001").accepted, "first clue analyzed")
	_require(scene.deduction_graph.add_edge("CLUE-002", "CLUE-003", "supports").accepted, "blockade evidence forms DED-002")
	scene.deduction_board.open_board()
	scene.deduction_board.selected_from = "CLUE-007"
	scene.deduction_board.selected_to = "CLUE-006"
	scene.deduction_board._on_relation_selected("supersedes")
	var synthesis_workbench: Control = scene.deduction_board.get_node("RepairSynthesisWorkbench")
	_require("DED-003" in scene.state.unlocked_deduction_ids and synthesis_workbench.visible, "forming DED-003 automatically opens the repair-record workbench")
	await process_frame
	await _viewport_click(synthesis_workbench.get_node("Bench/PlateRack/AC_PATH").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	await _viewport_click(synthesis_workbench.get_node("Bench/SlotRack/Slot0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	_require(scene.state.investigation_state["repair_synthesis_steps"] == [{"slot": 0, "plate_id": "AC_PATH"}], "one plausible wrong era placement remains visible and recoverable")
	_require(synthesis_workbench.get_node("Bench/Readout").text.contains("年代"), "wrong placement produces a world-specific era comparison")
	await _viewport_click(synthesis_workbench.get_node("Bench/SlotRack/Slot0").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	_require(scene.state.investigation_state["repair_synthesis_steps"].is_empty(), "clicking the occupied mechanical slot removes the wrong plate")
	for placement in [
		["REV3_STAMP", 0],
		["AC_PATH", 1],
		["FUSE_SPEC", 2],
	]:
		await _viewport_click(synthesis_workbench.get_node("Bench/PlateRack/%s" % placement[0]).get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		await _viewport_click(synthesis_workbench.get_node("Bench/SlotRack/Slot%d" % placement[1]).get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	_require(scene.save_service.save_state(scene.state) == OK, "partial and complete workbench slots use the strict resumable state")
	var synthesis_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	_require(float(synthesis_snapshot.get("investigation_state", {}).get("repair_synthesis_steps", [])[0].get("slot", -1)) == 0.0, "file-backed synthesis route exercises JSON numeric slot restoration")
	scene.deduction_board.close_board()
	var synthesis_resumed = await _resume_scene(packed, synthesis_snapshot)
	synthesis_resumed.deduction_board.open_board()
	await process_frame
	var resumed_workbench: Control = synthesis_resumed.deduction_board.get_node("RepairSynthesisWorkbench")
	_require(resumed_workbench.visible, "unfinished file-backed synthesis automatically reopens in the real workbench UI")
	_require(resumed_workbench.get_node("Bench/SlotRack/Slot0").text.contains("Rev.3"), "JSON float slot 0 renders the Rev.3 stamp in 年代")
	_require(resumed_workbench.get_node("Bench/SlotRack/Slot1").text.contains("A↔C"), "JSON float slot 1 renders the approved path")
	_require(resumed_workbench.get_node("Bench/SlotRack/Slot2").text.contains("保险丝"), "JSON float slot 2 renders the fuse specification")
	synthesis_resumed.deduction_board.close_board()
	synthesis_resumed.queue_free()
	for _frame in 4:
		await process_frame
	scene.deduction_board.open_board()
	await process_frame
	await _viewport_click(synthesis_workbench.get_node("Bench/CompressionHandle").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	_require(scene.state.investigation_state["repair_synthesis_complete"], "compression handle seals the exact three-plate mapping")
	_require("DED-004" not in scene.state.unlocked_deduction_ids, "correct synthesis does not bypass the remaining deduction relations")
	await _viewport_click(synthesis_workbench.get_node("Bench/Return").get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
	_require(not synthesis_workbench.visible and scene.deduction_board.visible, "workbench return restores the existing deduction surface")
	for edge in [
		["DED-002", "CLUE-004", "supports"],
		["CLUE-004", "CLUE-005", "supports"],
	]:
		_require(scene.deduction_graph.add_edge(edge[0], edge[1], edge[2]).accepted, "deduction edge %s" % str(edge))
	_require("DED-004" in scene.state.unlocked_deduction_ids, "final deduction unlocked")
	scene.deduction_board.refresh_cards()
	_require(scene.deduction_board.cards.size() == 11, "seven clue and four deduction cards rendered")
	scene.inventory_hud.refresh()
	_require(scene.inventory_hud.slots.size() == 4, "inventory rail renders the flashlight, two cabinet tools, and fuse")
	var panel_click = InputEventMouseButton.new()
	panel_click.button_index = MOUSE_BUTTON_LEFT
	panel_click.pressed = true
	scene.discovery_toast.visible = true
	scene.deduction_board.visible = true
	scene._on_power_panel_input(null, panel_click, 0)
	await _require_modal_guidance(scene, "依据维修记录复核配电机构，让船尾天线安全恢复供电", "REPAIR", "power-panel close-up")
	_require(not scene.get_node("UI/BoardButton").visible, "device close-up still hides the deduction-board action")
	_require(not scene.deduction_board.visible, "device close-up closes the deduction board surface")
	_require(not scene.discovery_toast.visible, "stale discovery or hint feedback is dismissed when the device close-up opens")
	scene._toast("近景内不应重新覆盖设备标签")
	_require(not scene.discovery_toast.visible, "device close-up rejects late toast or hint click-through")
	_require(not scene.inventory_hud.visible, "world-native diagnostic owns the close-up without an inventory overlay")
	var panel_anchor: Vector2 = scene.power_panel.position
	var invalid_feedback_codes: Array[String] = []
	scene.power_panel.device_feedback.connect(func(code: String): invalid_feedback_codes.append(code))
	var protector_click = InputEventMouseButton.new()
	protector_click.button_index = MOUSE_BUTTON_LEFT
	protector_click.pressed = true
	for _attempt in 3:
		scene.power_panel.get_node("ProtectorLever").input_event.emit(null, protector_click, 0)
	await create_timer(0.6).timeout
	_require(invalid_feedback_codes.size() == 3, "each rejected protector input emits exactly one device feedback")
	_require(scene.power_panel.position.is_equal_approx(panel_anchor), "repeated protector rejection returns the panel to its stable anchor")
	var lever_press = InputEventMouseButton.new()
	lever_press.button_index = MOUSE_BUTTON_LEFT
	lever_press.pressed = true
	var lever_drag = InputEventMouseMotion.new()
	lever_drag.relative = Vector2(0, 180)
	var lever_release = InputEventMouseButton.new()
	lever_release.button_index = MOUSE_BUTTON_LEFT
	lever_release.pressed = false
	scene.power_panel.get_node("BIsolationLever").input_event.emit(null, lever_press, 0)
	scene.power_panel.get_node("BIsolationLever").input_event.emit(null, lever_drag, 0)
	scene.power_panel.get_node("BIsolationLever").input_event.emit(null, lever_release, 0)
	_require(scene.state.device_state["b_isolated"], "physical B lever isolates the branch")
	var console = scene.power_panel.get_node("SignalWindowConsole")
	_require(console.visible, "B isolation exposes the embedded signal-window tray before the fuse")
	scene.power_panel.get_node("StandbyFuseSlot/DropTarget").item_dropped.emit("ITM-G01-002")
	_require(not scene.state.device_state["fuse_installed"], "physical fuse drop remains gated after B isolation until the diagnostic locks")
	_require("ITM-G01-002" in scene.state.inventory_item_ids, "premature fuse contact preserves the critical item")
	console.get_node("ProbeWrench").input_event.emit(null, panel_click, 0)
	_require(not scene.state.math_state["probe_prepared"], "one seated tool cannot prepare the diagnostic probe")
	var origin_marker: Area2D = console.get_node("OriginWheel/Marker")
	_require(not origin_marker.input_pickable, "one seated tool keeps the physical origin wheel gated")
	console.get_node("ProbeGloves").input_event.emit(null, panel_click, 0)
	_require(scene.state.math_state["probe_prepared"], "real wrench and glove nodes prepare the diagnostic together")
	_require(origin_marker.input_pickable, "the second physical probe tool grants ownership to the origin wheel")
	_require(scene.current_objective_text() == "先把基准缺口对准零点，再压下锁销记录相位原点", "diagnostic objective starts at the datum wheel once the probe is prepared")
	await _require_modal_guidance(scene, "先把基准缺口对准零点，再压下锁销记录相位原点", "ORIGIN", "diagnostic close-up")
	if not origin_marker.input_pickable:
		scene.queue_free()
		for _frame in 12:
			await process_frame
		_cleanup()
		_finish()
		return
	var fault_record_hotspot: Area2D = scene.get_node("World/FaultRecordHotspot")
	var power_panel_hotspot: Area2D = scene.get_node("World/PowerPanelHotspot")
	_require(not fault_record_hotspot.input_pickable and not power_panel_hotspot.input_pickable, "power-panel close-up owns input instead of leaving cockpit hotspots pickable")
	scene.flashlight.global_position = fault_record_hotspot.global_position
	await _viewport_click(origin_marker.global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["origin_tick"] == 1 and scene.state.math_state["observed_cycles"] == 0, "one real wheel event advances one datum stop without confirming it")
	await _viewport_click(console.get_node("OriginWheel/LockPin").global_position, MOUSE_BUTTON_LEFT)
	_require(console.last_feedback_code == "ORIGIN_MISMATCH" and scene.state.math_state["measurement_stage"] == "origin", "misaligned physical lock pin recoils locally")
	await _viewport_click(origin_marker.global_position, MOUSE_BUTTON_RIGHT)
	_require(scene.state.math_state["origin_tick"] == 0, "secondary wheel input returns the datum to zero exactly once")
	await _viewport_click(console.get_node("OriginWheel/LockPin").global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["measurement_stage"] == "echo" and scene.state.math_state["observed_cycles"] == 1, "physical lock pin confirms origin exactly once")
	_require(scene.current_objective_text() == "用双卡尺量出维护脉冲与弱回波的提前一格关系", "diagnostic objective advances to the caliper after the datum is confirmed")
	_require(not inspection.visible and scene.state.current_view == "POWER_PANEL", "origin-wheel coordinates cannot activate the underlying cockpit")
	for _step in 2:
		var pulse_before := int(scene.state.math_state["echo_measurement"]["pulse"])
		await _viewport_click(console.get_node("EchoCaliper/PulseJaw").global_position, MOUSE_BUTTON_LEFT)
		_require(int(scene.state.math_state["echo_measurement"]["pulse"]) != pulse_before, "each physical pulse-jaw event advances exactly one detent")
	for _step in 5:
		var echo_before := int(scene.state.math_state["echo_measurement"]["echo"])
		await _viewport_click(console.get_node("EchoCaliper/EchoJaw").global_position, MOUSE_BUTTON_LEFT)
		_require(int(scene.state.math_state["echo_measurement"]["echo"]) == echo_before + 1, "each physical echo-jaw event advances exactly one phase stop")
	await _viewport_click(console.get_node("EchoCaliper/MeasureLever").global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["measurement_stage"] == "blockade" and scene.state.math_state["observed_cycles"] == 2, "physical caliper lever confirms the signed echo once")
	_require(scene.state.math_state["echo_measurement"] == {"pulse": 6, "echo": 5, "confirmed": true}, "caliper leaves the authored negative-one evidence etched")
	_require(not inspection.visible and scene.state.current_view == "POWER_PANEL", "caliper coordinates cannot activate the underlying cockpit")
	for tick in [0, 3, 7, 8]:
		var marks_before: int = scene.state.math_state["blockade_marks"].size()
		await _viewport_click(console.get_node("BlockadeOverlay/Slot%02d" % tick).global_position, MOUSE_BUTTON_LEFT)
		_require(scene.state.math_state["blockade_marks"].size() == marks_before + 1, "each physical overlay slot records exactly one occupied stop")
	await _viewport_click(console.get_node("BlockadeOverlay/Clamp").global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["measurement_stage"] == "windows" and scene.state.math_state["observed_cycles"] == 3, "physical overlay clamp unlocks windows after the third distinct measurement")
	_require(scene.state.math_state["blockade_marks"] == [0, 3, 7, 8], "overlay clamp preserves the four exact occupied slots")
	_require(scene.current_objective_text() == "转动三枚采样窗，避开占用槽并保持等距", "diagnostic objective advances to the three sample shutters after the overlay locks")
	_require(not inspection.visible and scene.state.current_view == "POWER_PANEL", "overlay coordinates cannot activate the underlying cockpit")
	await _viewport_click(console.get_node("Window2").global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["sample_windows"] == [0, 0, 1], "one real viewport click advances the overlapping physical window exactly once")
	_require(not inspection.visible and scene.state.current_view == "POWER_PANEL", "overlapping console-window input cannot open the underlying tape evidence modal")
	await _viewport_click(console.get_node("Window2").global_position, MOUSE_BUTTON_RIGHT)
	_require(scene.state.math_state["sample_windows"] == [0, 0, 0], "real secondary input returns the test window to its preserved stop")
	await _viewport_click(Vector2(1340, 450), MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["sample_windows"] == [0, 0, 0], "console background input does not mutate the diagnostic shutters")
	_require(not inspection.visible and scene.state.current_view == "POWER_PANEL", "console background input cannot activate an underlying cockpit hotspot")
	var soft_lock_snapshot: Dictionary = scene.state.snapshot()
	soft_lock_snapshot["math_state"]["observed_cycles"] = 0
	var soft_lock_file = FileAccess.open(SMOKE_SAVE, FileAccess.WRITE)
	soft_lock_file.store_string(JSON.stringify(soft_lock_snapshot))
	soft_lock_file.close()
	var soft_lock_service = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE)
	var soft_lock_inspection: Dictionary = soft_lock_service.inspect_state()
	_require(not soft_lock_inspection.get("valid", true) and soft_lock_inspection.get("reason") == "unsupported_state", "windows-stage zero-cycle soft lock is rejected at the file boundary")
	var rejected_soft_lock: Dictionary = soft_lock_service.load_state()
	_require(rejected_soft_lock.is_empty(), "rejected windows-stage zero-cycle save never reaches scene restore")
	SceneDirector.pending_snapshot = rejected_soft_lock
	var rejected_resume = packed.instantiate()
	root.add_child(rejected_resume)
	await process_frame
	_require(rejected_resume.state.current_view == "COCKPIT" and not rejected_resume.power_panel.visible, "rejected soft lock instantiates only a clean cockpit, never a resumed console")
	_require(not rejected_resume.power_panel.get_node("SignalWindowConsole").visible, "rejected soft lock cannot instantiate its staged diagnostic controls")
	rejected_resume.queue_free()
	for _frame in 12:
		await process_frame
	_require(scene.save_service.save_state(scene.state) == OK, "active diagnostic state writes to the smoke save")
	var diagnostic_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	SceneDirector.pending_snapshot = diagnostic_snapshot
	var diagnostic_resumed = packed.instantiate()
	root.add_child(diagnostic_resumed)
	await process_frame
	var resumed_console = diagnostic_resumed.power_panel.get_node("SignalWindowConsole")
	_require(diagnostic_resumed.state.current_view == "POWER_PANEL" and diagnostic_resumed.power_panel.visible and resumed_console.visible, "disk resume restores the active diagnostic tray")
	_require(diagnostic_resumed.state.math_state["observed_cycles"] == 3 and diagnostic_resumed.state.math_state["measurement_stage"] == "windows", "disk resume preserves all three unlike measurements")
	_require(diagnostic_resumed.state.math_state["origin_tick"] == 0 and diagnostic_resumed.state.math_state["echo_measurement"]["confirmed"] and diagnostic_resumed.state.math_state["blockade_marks"] == [0, 3, 7, 8], "disk resume preserves origin, caliper, and overlay evidence")
	_require(resumed_console.get_node("Window0").input_pickable and not resumed_console.get_node("BlockadeOverlay/Slot00").input_pickable, "disk resume restores exact windows-stage control ownership")
	await _require_modal_guidance(diagnostic_resumed, "转动三枚采样窗，避开占用槽并保持等距", "WINDOWS", "diagnostic resume")
	_require(not diagnostic_resumed.get_node("UI/BoardButton").visible and not diagnostic_resumed.inventory_hud.visible, "diagnostic resume still suppresses board and inventory")
	_require(not diagnostic_resumed.get_node("World/FaultRecordHotspot").input_pickable and not diagnostic_resumed.get_node("World/PowerPanelHotspot").input_pickable, "diagnostic resume restores exclusive close-up input ownership")
	diagnostic_resumed._toast("late toast after diagnostic disk resume")
	_require(not diagnostic_resumed.discovery_toast.visible, "diagnostic resume rejects late toast overlays")
	diagnostic_resumed._close_power_panel()
	_require(diagnostic_resumed.get_node("UI/ObjectivePanel").visible and diagnostic_resumed.get_node("UI/StatusStrip").visible and diagnostic_resumed.get_node("UI/HintDock").visible and diagnostic_resumed.get_node("UI/BoardButton").visible and diagnostic_resumed.inventory_hud.visible, "leaving a restored diagnostic returns the exploration HUD")
	_require(diagnostic_resumed.get_node("World/FaultRecordHotspot").input_pickable and diagnostic_resumed.get_node("World/PowerPanelHotspot").input_pickable, "leaving a restored diagnostic returns cockpit hotspot ownership")
	diagnostic_resumed.queue_free()
	for _frame in 12:
		await process_frame
	for _step in 4:
		await _viewport_click(console.get_node("Window1").global_position, MOUSE_BUTTON_LEFT)
	for _step in 8:
		await _viewport_click(console.get_node("Window2").global_position, MOUSE_BUTTON_LEFT)
	await _viewport_click(console.get_node("LockLever").global_position, MOUSE_BUTTON_LEFT)
	_require(console.last_feedback_code == "BLOCKADE_COLLISION", "occupied sweep slots trigger local blockade feedback")
	_require(scene.state.math_state["sample_windows"] == [0, 4, 8], "blockade collision preserves all shutter positions")
	_require(console.get_node("SweepLamp").default_color.r > 0.8, "blockade collision drives a red local sweep")
	_require(console.get_node("ConsoleAudio").playing, "blockade collision emits a short procedural tone")
	for window_name in ["Window0", "Window1", "Window2"]:
		await _viewport_click(console.get_node(window_name).global_position, MOUSE_BUTTON_LEFT)
	var one_stop_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	var saved_windows: Array = one_stop_snapshot.get("math_state", {}).get("sample_windows", [])
	_require(saved_windows.size() == 3 and int(saved_windows[0]) == 1 and int(saved_windows[1]) == 5 and int(saved_windows[2]) == 9, "every one-stop shutter movement saves immediately")
	await _viewport_click(console.get_node("LockLever").global_position, MOUSE_BUTTON_LEFT)
	_require(scene.state.math_state["sample_windows"] == [1, 5, 9] and scene.state.math_state["window_locked"], "three physical shutters lock the derived phase")
	_require(not scene.state.math_state["completed"] and not scene.state.math_state["signal_split"], "Task 4 diagnostic completion does not forge the later dual-signal seal")
	_require(scene.current_objective_text() == "依据维修记录复核配电机构，让船尾天线安全恢复供电", "post-diagnostic objective returns to repair without revealing the operation sequence")
	_require(console.get_node("SuccessLamp").color.g > 0.8 and console.get_node("AmberLamp").color.r > 0.8, "diagnostic success lights the local green and amber lamps")
	await create_timer(0.65).timeout
	_require(console.position.is_equal_approx(Vector2(550, 184)), "rapid correction cancels the old local-shake tween")
	_require(is_equal_approx(console.get_node("LockLever/Handle").rotation, 0.62), "rapid correction keeps the successful lock lever latched after the old spring-return deadline")
	_require(console.get_node("SweepLamp").default_color.g > 0.8, "rapid correction prevents stale failure callbacks from overwriting the green success sweep")
	_require(absf(console.get_node("SweepLamp").rotation) > 1.0, "diagnostic success visibly sweeps the complete ring before tray retraction")
	await create_timer(0.35).timeout
	_require(not console.visible, "successful full-ring sweep retracts the diagnostic tray to reveal the repair chain")
	_require(scene.save_service.save_state(scene.state) == OK, "locked staged diagnostic writes through the strict save contract")
	var locked_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	var locked_math: Dictionary = locked_snapshot.get("math_state", {})
	_require(locked_math.get("measurement_stage") == "windows" and locked_math.get("window_locked", false), "disk snapshot retains diagnostic completion without future ending state")
	scene.queue_free()
	for _frame in 12:
		await process_frame
	SceneDirector.pending_snapshot = locked_snapshot
	var locked_resumed = packed.instantiate()
	root.add_child(locked_resumed)
	await process_frame
	var locked_console = locked_resumed.power_panel.get_node("SignalWindowConsole")
	_require(locked_resumed.state.current_view == "POWER_PANEL" and not locked_console.visible and locked_resumed.power_panel.visible, "locked diagnostic resumes in the physical panel with the completed measurement tray retracted")
	_require(locked_resumed.state.math_state["sample_windows"] == [1, 5, 9] and locked_resumed.state.math_state["window_locked"], "locked diagnostic resumes all three shutters")
	_require(not locked_console.get_node("Window0").input_pickable and not locked_console.get_node("LockLever").input_pickable, "locked diagnostic resume is read-only and cannot double-advance")
	_require(not locked_resumed.get_node("World/FaultRecordHotspot").input_pickable and not locked_resumed.get_node("World/PowerPanelHotspot").input_pickable, "locked diagnostic resume retains exclusive viewport ownership")
	var repair_scene = locked_resumed
	repair_scene.save_service = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE)
	repair_scene.power_panel.get_node("StandbyFuseSlot/DropTarget").item_dropped.emit("ITM-G01-002")
	_require(repair_scene.state.device_state["fuse_installed"] and "ITM-G01-002" not in repair_scene.state.inventory_item_ids, "physical fuse drop seats and consumes the fuse after diagnostic completion")
	var coupler_press = InputEventMouseButton.new()
	coupler_press.button_index = MOUSE_BUTTON_LEFT
	coupler_press.pressed = true
	var coupler_drag = InputEventMouseMotion.new()
	coupler_drag.relative = Vector2(132, 0)
	var coupler_release = InputEventMouseButton.new()
	coupler_release.button_index = MOUSE_BUTTON_LEFT
	coupler_release.pressed = false
	repair_scene.power_panel.get_node("CouplerKnob").input_event.emit(null, coupler_press, 0)
	repair_scene.power_panel.get_node("CouplerKnob").input_event.emit(null, coupler_drag, 0)
	repair_scene.power_panel.get_node("CouplerKnob").input_event.emit(null, coupler_release, 0)
	_require(is_equal_approx(float(repair_scene.state.device_state["coupler_angle"]), 90.0), "physical coupler drag latches the A-C path")
	repair_scene.power_panel.get_node("ProtectorLever").input_event.emit(null, protector_click, 0)
	_require(repair_scene.state.world_state == "POWER_RESTORED", "physical protector lever emits power restoration")
	_require(not repair_scene.state.math_state["signal_split"], "power restoration must not forge the later dual-signal seal")
	await create_timer(3.15).timeout
	var receiver: Control = repair_scene.get_node("UI/DualSignalVerification")
	_require(receiver.visible and repair_scene.state.current_view == "SIGNAL_VERIFY", "power restoration opens the exclusive physical receiver")
	_require(repair_scene.current_objective_text() == "先把自动维护载波调进绿色参考框并锁定", "receiver opens with the maintenance-carrier objective")
	await _require_modal_guidance(repair_scene, "先把自动维护载波调进绿色参考框并锁定", "MAINTENANCE", "receiver close-up")
	_require(not repair_scene.get_node("World/PowerPanelHotspot").input_pickable and not repair_scene.power_panel.visible, "receiver blocks cockpit and panel input")
	_require(not receiver.get_node("MaintenanceCarrier/Message").visible and not receiver.get_node("WeakCarrier/Message").visible, "no signal copy appears before a physical lock")
	var pre_seal_exchange: String = repair_scene.completion_card.get_node("Text").text
	_require(not repair_scene.completion_card.visible and not pre_seal_exchange.contains("七码：同一方向，两套互相冲突的指令。两条记录都不足以删除。") and not pre_seal_exchange.contains("星宇：都保留。先打开去领航核心的路，再判断。"), "the authored retained-record exchange stays hidden before seal")
	for _step in 3:
		await _viewport_click(receiver.get_node("MaintenanceCarrier/GainWheel/Increase").global_position, MOUSE_BUTTON_LEFT)
	await _viewport_click(receiver.get_node("MaintenanceCarrier/LockPaddle").global_position, MOUSE_BUTTON_LEFT)
	_require(receiver.get_node("MaintenanceCarrier/Message").visible and not receiver.get_node("WeakCarrier/Message").visible, "viewport maintenance lock reveals only the first broadcast")
	_require(repair_scene.current_objective_text() == "再分离前缘弱回波，把相位停在提前一格的位置", "receiver objective advances to the weak carrier after maintenance lock")
	for _step in 2:
		await _viewport_click(receiver.get_node("WeakCarrier/GainWheel/Increase").global_position, MOUSE_BUTTON_LEFT)
	for _step in 11:
		await _viewport_click(receiver.get_node("WeakCarrier/PhaseWheel/Advance").global_position, MOUSE_BUTTON_LEFT)
	await _viewport_click(receiver.get_node("WeakCarrier/LockPaddle").global_position, MOUSE_BUTTON_LEFT)
	_require(receiver.get_node("WeakCarrier/Message").visible, "viewport weak lock reveals the second record")
	_require(receiver.get_node("WeakCarrier/Message").text.contains("SENDER UNKNOWN") and receiver.get_node("WeakCarrier/Message").text.contains("文明修复者，请不要来。"), "the weak warning remains UNKNOWN with its exact text")
	_require(repair_scene.current_objective_text() == "两路记录都先保留，再压下封存杆", "receiver objective advances to the keep gates after both carriers lock")
	await _viewport_click(receiver.get_node("KeepGates/MaintenanceGate").global_position, MOUSE_BUTTON_LEFT)
	await _viewport_click(receiver.get_node("SealLever").global_position, MOUSE_BUTTON_LEFT)
	_require(not repair_scene.state.math_state["signal_verification"]["sealed"], "one physical keep gate cannot seal either record")
	_require(repair_scene.current_objective_text() == "第二路记录还未保留；两枚保留闸都压下后才能封存", "receiver objective narrows to the final keep gate after only one record is retained")
	await _viewport_click(receiver.get_node("KeepGates/WeakGate").global_position, MOUSE_BUTTON_LEFT)
	await _viewport_click(receiver.get_node("SealLever").global_position, MOUSE_BUTTON_LEFT)
	_require(repair_scene.state.math_state["signal_verification"]["sealed"], "both independent physical keep gates seal the record")
	_require(repair_scene.state.scene_phase == "SLICE_COMPLETE" and repair_scene.state.current_view == "COCKPIT", "seal reaches completion without entering another scene")
	var ending_text: String = receiver.get_node("MaintenanceCarrier/Message").text + receiver.get_node("WeakCarrier/Message").text
	_require(not ending_text.contains("零零") and not ending_text.contains("SCN-G01-01") and not ending_text.contains("城市循环"), "ending stays inside the sealed prologue without forbidden continuation copy")
	var sealed_exchange: String = repair_scene.completion_card.get_node("Text").text
	_require(sealed_exchange.contains("七码：同一方向，两套互相冲突的指令。两条记录都不足以删除。"), "seal reveals the authored Qima retention line")
	_require(sealed_exchange.contains("星宇：都保留。先打开去领航核心的路，再判断。"), "seal reveals the authored Xingyu retention line")
	_require(not repair_scene.inventory_hud.visible, "tool rail yields to the dual-signal ending")
	_require(repair_scene.restored_background.visible, "restored world art visible")
	_require(repair_scene.echo_indicator.visible, "stern echo visible")
	_require(repair_scene.completion_card.visible, "completion record visible after record seal")
	# Completion can be re-entered from a resumed save while a close-up visibility
	# update is still queued. The terminal state must close every physical close-up
	# idempotently instead of relying only on the first power-restored callback.
	repair_scene.power_panel.visible = true
	repair_scene.cabinet_world.visible = true
	repair_scene._finish_slice()
	_require(not repair_scene.power_panel.visible, "slice completion closes the power-panel close-up")
	_require(not repair_scene.cabinet_world.visible, "slice completion closes the repair-locker close-up")
	_require(repair_scene.save_service.save_state(repair_scene.state) == OK, "completed state writes to the smoke save")
	var disk_snapshot = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE).load_state()
	_require("ITM-G01-003" in disk_snapshot.get("inventory_item_ids", []) and "ITM-G01-004" in disk_snapshot.get("inventory_item_ids", []), "saved state retains both cabinet tools")
	var completed_math: Dictionary = disk_snapshot.get("math_state", {})
	var completed_windows: Array = completed_math.get("sample_windows", [])
	_require(completed_windows.size() == 3 and int(completed_windows[0]) == 1 and int(completed_windows[1]) == 5 and int(completed_windows[2]) == 9 and completed_math.get("completed", false) and completed_math.get("signal_split", false), "saved terminal state retains the completed diagnostic and separated signal")
	repair_scene.queue_free()
	# Give the audio server time to release generator playbacks after both
	# close-up and scene synth players have left the tree.
	for _frame in 12:
		await process_frame
	SceneDirector.pending_snapshot = disk_snapshot
	var resumed = packed.instantiate()
	root.add_child(resumed)
	await process_frame
	_require(resumed.state.scene_phase == "SLICE_COMPLETE", "disk resume restores slice completion")
	_require(resumed.state.current_view == "COCKPIT", "disk resume normalizes the terminal view")
	_require(resumed.completion_card.visible and not resumed.get_node("UI/DualSignalVerification").visible, "disk resume presents the sealed ending without reopening the receiver")
	var resumed_exchange: String = resumed.completion_card.get_node("Text").text
	_require(resumed_exchange.contains("七码：同一方向，两套互相冲突的指令。两条记录都不足以删除。") and resumed_exchange.contains("星宇：都保留。先打开去领航核心的路，再判断。"), "disk resume restores both authored retained-record lines after a legal seal")
	_require("ITM-G01-003" in resumed.state.inventory_item_ids and "ITM-G01-004" in resumed.state.inventory_item_ids, "disk resume restores both non-consumable cabinet tools")
	_require(not resumed.power_panel.visible and not resumed.cabinet_world.visible and not resumed.cabinet_return.visible, "disk resume closes every physical close-up")
	_require(not resumed.get_node("UI/ObjectivePanel").visible and not resumed.get_node("UI/StatusStrip").visible, "disk resume hides exploration readouts")
	_require(not resumed.get_node("UI/HintDock").visible and not resumed.get_node("UI/BoardButton").visible and not resumed.inventory_hud.visible, "disk resume hides exploration actions")
	resumed.queue_free()
	for _frame in 12:
		await process_frame
	_cleanup()
	_finish()

func _require(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)

func _viewport_click(position: Vector2, button_index: MouseButton) -> void:
	var press := InputEventMouseButton.new()
	press.position = position
	press.global_position = position
	press.button_index = button_index
	press.button_mask = MOUSE_BUTTON_MASK_LEFT if button_index == MOUSE_BUTTON_LEFT else MOUSE_BUTTON_MASK_RIGHT
	press.pressed = true
	root.push_input(press, true)
	await physics_frame
	var release := InputEventMouseButton.new()
	release.position = position
	release.global_position = position
	release.button_index = button_index
	release.button_mask = 0
	release.pressed = false
	root.push_input(release, true)
	await physics_frame

func _viewport_hold(position: Vector2, duration: float) -> void:
	var press := InputEventMouseButton.new()
	press.position = position
	press.global_position = position
	press.button_index = MOUSE_BUTTON_LEFT
	press.button_mask = MOUSE_BUTTON_MASK_LEFT
	press.pressed = true
	root.push_input(press, true)
	await create_timer(duration).timeout
	var release := InputEventMouseButton.new()
	release.position = position
	release.global_position = position
	release.button_index = MOUSE_BUTTON_LEFT
	release.button_mask = 0
	release.pressed = false
	root.push_input(release, true)
	await physics_frame

func _require_modal_guidance(scene: Node, objective_text: String, hint_key: String, context: String) -> void:
	var objective_panel: Control = scene.get_node("UI/ObjectivePanel")
	var status_strip: Control = scene.get_node("UI/StatusStrip")
	var hint_dock: Control = scene.get_node("UI/HintDock")
	_require(objective_panel.visible, "%s keeps the current objective visible" % context)
	_require(status_strip.visible, "%s keeps modal hint feedback readable" % context)
	_require(hint_dock.visible, "%s keeps the hint action clickable" % context)
	_require(scene.get_node("UI/ObjectivePanel/Margin/Stack/Objective").text == objective_text, "%s objective label mirrors the live route guidance" % context)
	var hint_entries: Array = scene.scene_data.get("hints", {}).get(hint_key, [])
	_require(hint_entries.size() == 3, "%s exposes exactly three hint tiers for %s" % [context, hint_key])
	if hint_entries.size() != 3:
		return
	scene.state.last_progress_elapsed_seconds = 0.0
	for tier_state in [[125.0, 1], [305.0, 2], [545.0, 3]]:
		scene.state.elapsed_seconds = float(tier_state[0])
		await _viewport_click(hint_dock.get_global_rect().get_center(), MOUSE_BUTTON_LEFT)
		var tier := int(tier_state[1])
		_require(int(scene.state.hint_stage) == tier, "%s advances to hint tier %d from a real click" % [context, tier])
		_require(scene.get_node("UI/StatusStrip/Status").text.contains(str(hint_entries[tier - 1])), "%s renders tier %d hint text in-modal" % [context, tier])

func _open_evidence(scene: Node, clue_id: String) -> void:
	var hotspot: Area2D = {
		"CLUE-002": scene.get_node("World/BurnMarkHotspot"),
		"CLUE-003": scene.get_node("World/FaultRecordHotspot"),
		"CLUE-004": scene.get_node("World/CouplerPlateHotspot"),
	}[clue_id]
	scene.flashlight.global_position = hotspot.global_position
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	scene._on_evidence_hotspot_input(null, click, 0, clue_id)
	await process_frame

func _resume_scene(packed: PackedScene, snapshot: Dictionary) -> Node:
	SceneDirector.pending_snapshot = snapshot
	var resumed = packed.instantiate()
	root.add_child(resumed)
	await process_frame
	resumed.save_service = preload("res://scripts/core/SaveService.gd").new(SMOKE_SAVE)
	return resumed

func _cleanup() -> void:
	if FileAccess.file_exists(SMOKE_SAVE):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SMOKE_SAVE))
	var temp = SMOKE_SAVE.replace(".json", ".tmp")
	if FileAccess.file_exists(temp):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(temp))

func _finish() -> void:
	for failure in failures:
		push_error(failure)
	print("RUNTIME SMOKE PASSED" if failures.is_empty() else "RUNTIME SMOKE FAILED: %d" % failures.size())
	quit(0 if failures.is_empty() else 1)
