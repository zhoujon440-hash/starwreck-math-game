class_name SCNG0100
extends Node2D

var state = preload("res://scripts/core/GameState.gd").new()
var clue_service: RefCounted
var inventory_service: RefCounted
var deduction_graph: RefCounted
var hint_service: RefCounted
var save_service = preload("res://scripts/core/SaveService.gd").new()
var scene_data: Dictionary = {}
var emergency_clock := 0.0
var toast_tween: Tween

const COCKPIT_HOTSPOT_PATHS: Array[NodePath] = [
	^"World/PowerPanelHotspot",
	^"World/BurnMarkHotspot",
	^"World/EmergencyStripHotspot",
	^"World/FaultRecordHotspot",
	^"World/CouplerPlateHotspot",
	^"World/MaintenanceCabinetHotspot",
]

@onready var world_camera: Camera2D = $World/WorldCamera
@onready var flashlight = $World/Flashlight
@onready var flashlight_pickup = $World/FlashlightPickup
@onready var status_label: Label = $UI/StatusStrip/Status
@onready var objective_label: Label = $UI/ObjectivePanel/Margin/Stack/Objective
@onready var phase_label: Label = $UI/ObjectivePanel/Margin/Stack/Phase
@onready var discovery_toast: PanelContainer = $UI/DiscoveryToast
@onready var deduction_board = $UI/DeductionBoard
@onready var inventory_hud = $UI/InventoryHud
@onready var cabinet_hotspot = $World/MaintenanceCabinetHotspot
@onready var cabinet_world = $World/MaintenanceCabinetWorld
@onready var cabinet_return: Button = $UI/CabinetReturn
@onready var fuse_pickup = $World/MaintenanceCabinetWorld/FusePickup
@onready var power_panel = $World/PowerPanelWorld
@onready var blackout: ColorRect = $World/Blackout
@onready var emergency_glow: Polygon2D = $World/EmergencyGlow
@onready var restored_background: TextureRect = $World/RestoredBackground
@onready var echo_indicator: Label = $World/EchoIndicator
@onready var completion_card: PanelContainer = $UI/CompletionCard
@onready var incident_brief: PanelContainer = $UI/IncidentBrief
@onready var dual_signal_verification: Control = $UI/DualSignalVerification
@onready var evidence_inspection: Control = $UI/EvidenceInspection

func _ready() -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if parsed is Dictionary:
		scene_data = parsed
	var pending = preload("res://scripts/core/SceneDirector.gd").take_pending_snapshot()
	if not pending.is_empty():
		state.restore(pending)
	_prepare_narrative_ui()
	clue_service = preload("res://scripts/clue/ClueService.gd").new(state)
	inventory_service = preload("res://scripts/inventory/InventoryService.gd").new(state)
	deduction_graph = preload("res://scripts/clue/DeductionGraph.gd").new(state)
	hint_service = preload("res://scripts/core/HintService.gd").new(state)
	deduction_board.setup(state, deduction_graph)
	deduction_board.deduction_unlocked.connect(_on_deduction_unlocked)
	deduction_board.state_changed.connect(_on_board_state_changed)
	evidence_inspection.setup(state, scene_data.get("forensic_workbench", {}))
	evidence_inspection.clue_completed.connect(_on_clue_observed)
	evidence_inspection.close_requested.connect(_close_evidence_inspection)
	evidence_inspection.state_changed.connect(_on_inspection_state_changed)
	inventory_hud.setup(state, inventory_service)
	inventory_hud.item_armed.connect(_on_inventory_item_armed)
	power_panel.setup(state, inventory_service)
	power_panel.power_restored.connect(_on_power_restored)
	power_panel.milestone_reached.connect(_on_panel_milestone)
	power_panel.close_requested.connect(_close_power_panel)
	power_panel.device_feedback.connect(_on_device_feedback)
	dual_signal_verification.setup(state, _receiver_config(), scene_data.get("ending_signals", []))
	dual_signal_verification.state_changed.connect(_on_signal_verification_state_changed)
	dual_signal_verification.verification_completed.connect(_on_signal_verification_completed)
	flashlight_pickup.input_event.connect(_on_flashlight_pickup_input)
	$World/PowerPanelHotspot.input_event.connect(_on_power_panel_input)
	$World/BurnMarkHotspot.input_event.connect(_on_evidence_hotspot_input.bind("CLUE-002"))
	$World/FaultRecordHotspot.input_event.connect(_on_evidence_hotspot_input.bind("CLUE-003"))
	$World/CouplerPlateHotspot.input_event.connect(_on_evidence_hotspot_input.bind("CLUE-004"))
	for hotspot in [$World/BurnMarkHotspot, $World/FaultRecordHotspot, $World/CouplerPlateHotspot]:
		hotspot.mouse_entered.connect(_on_evidence_hover.bind(hotspot, true))
		hotspot.mouse_exited.connect(_on_evidence_hover.bind(hotspot, false))
	cabinet_hotspot.input_event.connect(_on_cabinet_input)
	fuse_pickup.input_event.connect(_on_fuse_input)
	$World/MaintenanceCabinetWorld/WrenchDistractor.input_event.connect(_on_cabinet_obstruction_input.bind("wrench"))
	$World/MaintenanceCabinetWorld/GloveDistractor.input_event.connect(_on_cabinet_obstruction_input.bind("glove"))
	$World/MaintenanceCabinetWorld/FuseLatchLeft.input_event.connect(_on_fuse_latch_input.bind(0))
	$World/MaintenanceCabinetWorld/FuseLatchRight.input_event.connect(_on_fuse_latch_input.bind(1))
	$UI/BoardButton.pressed.connect(_open_board)
	$UI/HintDock.pressed.connect(_on_hint_requested)
	cabinet_return.pressed.connect(_leave_cabinet)
	for node in get_tree().get_nodes_in_group("inspectables"):
		if not is_ancestor_of(node):
			continue
		node.bind_flashlight(flashlight)
		node.observed.connect(_on_clue_observed)
		node.interaction_rejected.connect(_on_unlit_inspection)
	_restore_from_state()

func _process(delta: float) -> void:
	state.elapsed_seconds += delta
	emergency_clock += delta
	if state.world_state != "POWER_RESTORED":
		emergency_glow.modulate.a = 0.58 + sin(emergency_clock * 2.1) * 0.28
	if flashlight_pickup.visible:
		flashlight_pickup.rotation = sin(emergency_clock * 1.4) * 0.025
	if Input.is_action_just_pressed("toggle_deduction_board") and not get_tree().paused:
		_open_board()
	if Input.is_action_just_pressed("ui_cancel"):
		if evidence_inspection.visible:
			evidence_inspection.close_inspection()
		elif power_panel.visible:
			_close_power_panel()
		elif cabinet_world.visible:
			_leave_cabinet()

func _exit_tree() -> void:
	if has_node("UI/UISynth"):
		$UI/UISynth.stop()
		$UI/UISynth.stream = null

func _on_flashlight_pickup_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if inventory_service.acquire("ITM-G01-001"):
			incident_brief.visible = false
			flashlight.set_active(true)
			flashlight_pickup.visible = false
			state.scene_phase = "INVESTIGATE"
			_mark_progress()
			_toast("应急手灯接入设备袋\n光束停留在可疑细节上时，表面会出现轻微轮廓。")
			status_label.text = "拾光号仍有微弱应急电。开始检查事故现场。"
			inventory_hud.refresh()
			_update_objective()
			_play_ui_tone(260.0, 0.1, 0.16)
			_save()

func _on_clue_observed(clue_id: String) -> void:
	if clue_service.observe(clue_id):
		_mark_progress()
		var title = _entry_title(clue_id)
		status_label.text = "证据记录 %d / 7 · %s" % [state.observed_clue_ids.size(), title]
		_toast("证据已记录 · %s\n%s" % [title, _entry_text(clue_id)])
		deduction_board.refresh_cards()
		_update_objective()
		_play_ui_tone(410.0, 0.08, 0.13)
		_save()

func _on_unlit_inspection(_clue_id: String) -> void:
	status_label.text = "表面细节藏在阴影里。把手灯光束稳定在目标上再检查。"
	_play_ui_tone(105.0, 0.07, 0.09)

func _on_evidence_hotspot_input(_viewport: Node, event: InputEvent, _shape_idx: int, clue_id: String) -> void:
	if not (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed):
		return
	var hotspot: Area2D = {
		"CLUE-002": $World/BurnMarkHotspot,
		"CLUE-003": $World/FaultRecordHotspot,
		"CLUE-004": $World/CouplerPlateHotspot,
	}.get(clue_id)
	if hotspot == null or not flashlight.is_point_lit(hotspot.global_position):
		_on_unlit_inspection(clue_id)
		return
	state.current_view = "EVIDENCE"
	state.investigation_state["active_inspection_clue"] = clue_id
	_set_cockpit_hotspots_pickable(false)
	_set_exploration_hud_visible(false)
	inventory_hud.visible = false
	evidence_inspection.open_inspection(clue_id)
	_update_objective()
	_save()

func _on_evidence_hover(hotspot: Area2D, hovered: bool) -> void:
	var glow: Polygon2D = hotspot.get_node("Glow")
	var target_alpha := 0.2 if hovered and flashlight.is_point_lit(hotspot.global_position) else 0.0
	create_tween().tween_property(glow, "color:a", target_alpha, 0.12)

func _on_inspection_state_changed() -> void:
	_mark_progress()
	_update_objective()
	_save()

func _on_cabinet_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if not flashlight.active:
			status_label.text = "柜门内完全无光。先找一件可靠的照明工具。"
			return
		_enter_cabinet()

func _enter_cabinet() -> void:
	if cabinet_world.visible or power_panel.visible:
		return
	state.current_view = "CABINET"
	_set_exploration_hud_visible(false)
	inventory_hud.visible = false
	_refresh_cabinet_interactions()
	world_camera.position = Vector2(560, 550)
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(world_camera, "zoom", Vector2(1.08, 1.08), 0.32).set_trans(Tween.TRANS_SINE)
	tween.tween_property(blackout, "color:a", 0.94, 0.28)
	tween.set_parallel(false)
	tween.tween_callback(func():
		cabinet_world.visible = true
		cabinet_return.visible = true
		world_camera.position = Vector2(960, 540)
		world_camera.zoom = Vector2.ONE
		blackout.color.a = 0.38
	)
	status_label.text = "维修柜近景 · 改装留下的新旧物件混在一起。"
	_update_objective()
	_save()

func _leave_cabinet() -> void:
	if not cabinet_world.visible:
		return
	blackout.color.a = 0.92
	cabinet_world.visible = false
	cabinet_return.visible = false
	state.current_view = "COCKPIT"
	_set_exploration_hud_visible(true)
	inventory_hud.visible = true
	world_camera.position = Vector2(960, 540)
	world_camera.zoom = Vector2.ONE
	var tween = create_tween()
	tween.tween_property(blackout, "color:a", 0.76, 0.28)
	status_label.text = "回到领航舱。维修柜中的记录已经保留在线索板。"
	_update_objective()
	_save()

func _on_fuse_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if not evidence_inspection.mechanics.can_take_fuse():
			status_label.text = "保险丝仍被两枚保持卡扣压住。"
			return
		if inventory_service.acquire("ITM-G01-002"):
			fuse_pickup.visible = false
			inventory_hud.refresh()
			_on_clue_observed("CLUE-005")
			_toast("临时保险丝收入设备袋\n铭刻规格与备用耦合槽吻合。")
			_save()

func _on_cabinet_obstruction_input(_viewport: Node, event: InputEvent, _shape_idx: int, obstruction_name: String) -> void:
	if not (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed):
		return
	var result = evidence_inspection.mechanics.move_cabinet_obstruction(obstruction_name)
	if not result.ok:
		return
	var tool_id: String = str({"wrench": "ITM-G01-003", "glove": "ITM-G01-004"}.get(obstruction_name, ""))
	if inventory_service.acquire(tool_id):
		inventory_hud.refresh()
	if not bool(result.get("changed", false)):
		return
	var message := "旧扳手移入下层工具格；被压住的旧 B→C 标签露了出来。" if obstruction_name == "wrench" else "绝缘手套移到侧袋；Rev.3 后压复检戳与保险丝卡扣显露。"
	status_label.text = message
	_toast(message)
	_play_ui_tone(180.0, 0.06, 0.08)
	_mark_progress()
	_refresh_cabinet_interactions()
	_save()

func _on_fuse_latch_input(_viewport: Node, event: InputEvent, _shape_idx: int, index: int) -> void:
	if not (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed):
		return
	var result = evidence_inspection.mechanics.toggle_fuse_latch(index)
	if result.ok:
		status_label.text = "保险丝保持卡扣 %d / 2 已释放。" % state.investigation_state["fuse_latches"].count(true)
		_mark_progress()
		_refresh_cabinet_interactions()
		_save()
	else:
		status_label.text = "卡扣藏在零散维修物件后方；先整理柜内遮挡。"

func _refresh_cabinet_interactions() -> void:
	var obstructions: Dictionary = state.investigation_state.get("cabinet_obstructions", {})
	var wrench_moved := bool(obstructions.get("wrench", false))
	var glove_moved := bool(obstructions.get("glove", false))
	var cabinet = $World/MaintenanceCabinetWorld
	cabinet.get_node("Wrench").position = Vector2(620, 684) if wrench_moved else Vector2(575, 365)
	cabinet.get_node("WrenchShadow").position = Vector2(45, 319) if wrench_moved else Vector2.ZERO
	cabinet.get_node("WrenchDistractor").position = cabinet.get_node("Wrench").position
	cabinet.get_node("WrenchDistractor").input_pickable = not wrench_moved
	cabinet.get_node("OldLabelHotspot").input_pickable = wrench_moved
	cabinet.get_node("Glove").position = Vector2(820, 782) if glove_moved else Vector2(1320, 330)
	cabinet.get_node("GloveShadow").position = Vector2(-500, 452) if glove_moved else Vector2.ZERO
	cabinet.get_node("GloveDistractor").position = cabinet.get_node("Glove").position
	cabinet.get_node("GloveDistractor").input_pickable = not glove_moved
	cabinet.get_node("RevisionMarkHotspot").input_pickable = glove_moved
	var holder_exposed := wrench_moved and glove_moved
	var latches: Array = state.investigation_state.get("fuse_latches", [false, false])
	for index in 2:
		var latch: Area2D = cabinet.get_node("FuseLatchLeft" if index == 0 else "FuseLatchRight")
		latch.input_pickable = holder_exposed and not bool(latches[index])
		latch.get_node("Clip").rotation = (-0.65 if index == 0 else 0.65) if bool(latches[index]) else 0.0
		latch.get_node("Clip").color = Color(0.18, 0.48, 0.43, 0.72) if bool(latches[index]) else Color(0.12, 0.15, 0.15, 0.94)
	fuse_pickup.input_pickable = holder_exposed and bool(latches[0]) and bool(latches[1]) and fuse_pickup.visible

func _on_inventory_item_armed(item_id: String) -> void:
	status_label.text = "%s已拿在手中。拖向现场设备，或单击真实插槽。" % _entry_title(item_id)

func _open_board() -> void:
	if state.observed_clue_ids.is_empty():
		status_label.text = "工作台还没有可比对的现场证据。"
		return
	if state.scene_phase == "INVESTIGATE" and state.observed_clue_ids.size() >= 3:
		state.scene_phase = "DEDUCTION"
	deduction_board.open_board()

func _close_evidence_inspection() -> void:
	if state.scene_phase == "SLICE_COMPLETE":
		return
	state.current_view = "COCKPIT"
	state.investigation_state["active_inspection_clue"] = ""
	_set_cockpit_hotspots_pickable(true)
	_set_exploration_hud_visible(true)
	inventory_hud.visible = true
	_update_objective()
	_save()

func _on_board_state_changed() -> void:
	_mark_progress()
	_update_objective()
	_save()

func _on_deduction_unlocked(id: String) -> void:
	_mark_progress()
	deduction_board.refresh_cards()
	_toast("推论形成 · %s\n%s" % [id, _entry_text(id)])
	status_label.text = "推论已固定在工作台：%s" % _entry_text(id)
	_update_objective()
	_play_ui_tone(520.0, 0.12, 0.15)
	_save()

func _on_power_panel_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if not flashlight.active:
			status_label.text = "配电箱内部无照明，无法安全检查。"
			return
		if cabinet_world.visible:
			_leave_cabinet()
		if "DED-004" not in state.unlocked_deduction_ids:
			status_label.text = "总配电入口已定位，但 Rev.3 恢复路径尚未证实。先完成工作台推论。"
			_toast("配电箱保持锁定\n工作台需要先形成 Rev.3 的批准恢复原则。")
			return
		state.current_view = "POWER_PANEL"
		state.scene_phase = "REPAIR"
		_set_cockpit_hotspots_pickable(false)
		if deduction_board.visible:
			deduction_board.close_board()
		_set_exploration_hud_visible(false)
		inventory_hud.visible = false
		power_panel.visible = true
		status_label.text = "配电箱近景 · 机构会通过回弹、卡位和状态灯反馈操作。"
		_update_objective()
		_save()

func _close_power_panel() -> void:
	if not power_panel.visible:
		return
	power_panel.visible = false
	_set_cockpit_hotspots_pickable(true)
	_set_exploration_hud_visible(true)
	inventory_hud.visible = true
	state.current_view = "COCKPIT"
	status_label.text = "离开配电箱近景。正确的机械进度已经保留。"
	_update_objective()
	_save()

func _on_panel_milestone(_name: String) -> void:
	_mark_progress()
	inventory_hud.refresh()
	_update_objective()
	_save()

func _on_device_feedback(code: String) -> void:
	status_label.text = "设备反馈 · %s" % code

func _on_power_restored() -> void:
	state.scene_phase = "POWER_RESTORED"
	state.current_view = "COCKPIT"
	power_panel.visible = false
	$UI/BoardButton.visible = false
	$UI/HintDock.visible = false
	$UI/ObjectivePanel.visible = false
	$UI/StatusStrip.visible = false
	inventory_hud.visible = false
	emergency_glow.visible = false
	restored_background.visible = true
	restored_background.modulate.a = 0.0
	world_camera.position = Vector2(960, 540)
	world_camera.zoom = Vector2(1.06, 1.06)
	var sequence = create_tween()
	sequence.tween_property(blackout, "color:a", 0.42, 0.45)
	sequence.parallel().tween_property(restored_background, "modulate:a", 1.0, 0.8)
	sequence.tween_callback(func():
		$World/PowerRestoreSequence/LightBandLeft.visible = true
		_play_ui_tone(220.0, 0.16, 0.12)
	)
	sequence.tween_interval(0.32)
	sequence.tween_callback(func():
		$World/PowerRestoreSequence/LightBandRight.visible = true
		_play_ui_tone(330.0, 0.16, 0.12)
	)
	sequence.tween_interval(0.32)
	sequence.tween_callback(func():
		$World/PowerRestoreSequence/ConsoleWake.visible = true
		_play_ui_tone(440.0, 0.18, 0.13)
	)
	sequence.tween_interval(0.44)
	sequence.tween_callback(func():
		$World/PowerRestoreSequence/NavigationDoorGlow.visible = true
		echo_indicator.visible = true
		echo_indicator.text = "船尾天线 · 同向双信号正在分离"
	)
	sequence.tween_property(world_camera, "zoom", Vector2.ONE, 0.8).set_trans(Tween.TRANS_SINE)
	sequence.tween_callback(_open_signal_verification)
	status_label.text = "灯带与船尾天线正在逐段重启……两组载波来自同一方向。"
	_save()

func _receiver_config() -> Dictionary:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00_math.json"))
	return parsed if parsed is Dictionary else {}

func _open_signal_verification() -> void:
	if state.scene_phase == "SLICE_COMPLETE" or bool(state.math_state["signal_verification"]["sealed"]):
		return
	state.current_view = "SIGNAL_VERIFY"
	_set_cockpit_hotspots_pickable(false)
	_set_exploration_hud_visible(false)
	inventory_hud.visible = false
	power_panel.visible = false
	dual_signal_verification.visible = true
	dual_signal_verification._refresh_visuals()
	status_label.text = "船尾接收器近景 · 先锁定自动维护窄带。"
	_update_objective()
	_save()

func _on_signal_verification_state_changed() -> void:
	_mark_progress()
	_update_objective()
	if not bool(state.math_state["signal_verification"]["sealed"]):
		_save()

func _on_signal_verification_completed() -> void:
	state.math_state["measurement_stage"] = "complete"
	state.math_state["completed"] = true
	state.math_state["signal_split"] = true
	_finish_slice()

func _finish_slice() -> void:
	state.scene_phase = "SLICE_COMPLETE"
	state.current_view = "COCKPIT"
	_apply_terminal_presentation()
	_play_ui_tone(660.0, 0.42, 0.12)
	_save()

func _apply_terminal_presentation() -> void:
	# This is deliberately idempotent: fresh completion and disk resume must
	# converge on the same terminal view without replaying audio or saving again.
	state.current_view = "COCKPIT"
	get_tree().paused = false
	cabinet_world.visible = false
	power_panel.visible = false
	cabinet_return.visible = false
	deduction_board.visible = false
	evidence_inspection.visible = false
	dual_signal_verification.visible = false
	incident_brief.visible = false
	discovery_toast.visible = false
	_set_exploration_hud_visible(false)
	inventory_hud.visible = false
	blackout.visible = false
	completion_card.visible = true
	$UI/CompletionCard/Text.text = "领航舱恢复供电\n双重信号已原样保留\n\n%s\n\nSCN-G01-00 · 航向零号地球" % _terminal_exchange_text()
	status_label.text = "领航舱供电恢复。相互冲突的两条信号均已保留。"
	phase_label.text = "SCN-G01-00 · RECORD SEALED"
	objective_label.text = "通往领航核心的照明已恢复；本调查切片在此结束"

func _terminal_exchange_text() -> String:
	var exchange: Array = scene_data.get("ending_exchange", [])
	return "\n".join(PackedStringArray(exchange))

func _on_hint_requested() -> void:
	var hint = hint_service.current_hint()
	var modal_guidance_active := _shows_modal_guidance()
	if hint.is_empty():
		var message := "现场仍很新鲜。先观察空间与设备反馈；更具体的提示会在停滞后出现。"
		if modal_guidance_active:
			status_label.text = "现场提示 · %s" % message
		else:
			_toast(message)
	else:
		var message := "现场提示 · 第 %d 层\n%s" % [state.hint_stage, hint]
		if modal_guidance_active:
			status_label.text = message
		else:
			_toast(message)
		_save()

func _restore_from_state() -> void:
	flashlight.set_active("ITM-G01-001" in state.inventory_item_ids or "ITM-G01-001" in state.installed_item_ids)
	flashlight_pickup.visible = not flashlight.active
	fuse_pickup.visible = "ITM-G01-002" not in state.inventory_item_ids and "ITM-G01-002" not in state.installed_item_ids
	_refresh_cabinet_interactions()
	deduction_graph.recompute()
	deduction_board.refresh_cards()
	inventory_hud.refresh()
	if state.world_state == "POWER_RESTORED":
		incident_brief.visible = false
		inventory_hud.visible = false
		blackout.visible = false
		emergency_glow.visible = false
		restored_background.visible = true
		$World/PowerRestoreSequence/LightBandLeft.visible = true
		$World/PowerRestoreSequence/LightBandRight.visible = true
		$World/PowerRestoreSequence/ConsoleWake.visible = true
		$World/PowerRestoreSequence/NavigationDoorGlow.visible = true
		echo_indicator.visible = true
		echo_indicator.text = "船尾天线 · 双路记录等待核验"
		if state.scene_phase == "SLICE_COMPLETE":
			_apply_terminal_presentation()
		elif state.current_view == "SIGNAL_VERIFY":
			_open_signal_verification()
		else:
			completion_card.visible = false
			call_deferred("_open_signal_verification")
	if state.current_view == "CABINET" and state.world_state != "POWER_RESTORED":
		_set_exploration_hud_visible(false)
		inventory_hud.visible = false
		cabinet_world.visible = true
		cabinet_return.visible = true
		blackout.color.a = 0.38
	elif state.current_view == "POWER_PANEL" and state.world_state != "POWER_RESTORED":
		_set_cockpit_hotspots_pickable(false)
		_set_exploration_hud_visible(false)
		deduction_board.visible = false
		inventory_hud.visible = false
		power_panel.visible = true
	elif state.current_view == "EVIDENCE" and state.world_state != "POWER_RESTORED":
		var active_clue := str(state.investigation_state.get("active_inspection_clue", ""))
		if active_clue in ["CLUE-002", "CLUE-003", "CLUE-004"]:
			_set_cockpit_hotspots_pickable(false)
			_set_exploration_hud_visible(false)
			inventory_hud.visible = false
			evidence_inspection.open_inspection(active_clue)
		else:
			state.current_view = "COCKPIT"
	_update_objective()

func _update_objective() -> void:
	phase_label.text = "SCN-G01-00 · %s" % state.scene_phase
	objective_label.text = current_objective_text()

func current_objective_text() -> String:
	if not _has_flashlight_guidance():
		return "在断电领航舱中寻找应急照明"
	match _guidance_objective_key():
		"BURN_BASELINE":
			return "调平四段热层基线，再锁住烧蚀扫描参考带"
		"BURN_SCAN":
			return "沿四个方向稳定复扫烧蚀切口，确认冲击由外向内"
		"TAPE_ORDER":
			return "先排定三卷纸带顺序，再让两道压线与浪涌峰跨缝连续"
		"PLATE_TRACE":
			return "依次泄压双锁并沿 Rev.3 刻槽追踪批准路径"
		"SYNTHESIS":
			return "把年代、批准路径、备用槽三枚校验片压合成维修记录"
		"ORIGIN":
			return "先把基准缺口对准零点，再压下锁销记录相位原点"
		"CALIPER":
			return "用双卡尺量出维护脉冲与弱回波的提前一格关系"
		"BLOCKADE":
			return "在透明覆片标出四个封锁占用槽，再压下夹具"
		"WINDOWS":
			return "转动三枚采样窗，避开占用槽并保持等距"
		"MAINTENANCE":
			return "先把自动维护载波调进绿色参考框并锁定"
		"WEAK":
			return "再分离前缘弱回波，把相位停在提前一格的位置"
		"KEEP_GATES":
			return "两路记录都先保留，再压下封存杆"
		"KEEP_FINAL":
			return "第二路记录还未保留；两枚保留闸都压下后才能封存"
		"REPAIR":
			return "依据维修记录复核配电机构，让船尾天线安全恢复供电"
	if state.observed_clue_ids.size() < 4:
		return "用手灯检查焦痕、记录窗与设备铭牌"
	if state.observed_clue_ids.size() < 7:
		return "打开维修柜，辨别新旧改装信息"
	if "DED-001" not in state.unlocked_deduction_ids:
		return "在线索板研判应急电源状态"
	if "DED-004" not in state.unlocked_deduction_ids:
		return "在线索板排除旧旁路并形成恢复原则"
	if state.device_state.get("b_isolated", false) and not bool(state.math_state.get("probe_prepared", false)) and not bool(state.math_state.get("window_locked", false)):
		return "用扳手和绝缘手套装好双探针，再开始三轮测量"
	if state.world_state != "POWER_RESTORED":
		return "回到配电箱，把推论落实为实体操作"
	return "观察领航舱复电并分离船尾双信号"

func _guidance_objective_key() -> String:
	if state == null:
		return ""
	if state.current_view == "EVIDENCE":
		var active_clue := str(state.investigation_state.get("active_inspection_clue", ""))
		match active_clue:
			"CLUE-002":
				return "BURN_SCAN" if bool(state.investigation_state.get("burn_baseline_locked", false)) else "BURN_BASELINE"
			"CLUE-003":
				return "TAPE_ORDER"
			"CLUE-004":
				return "PLATE_TRACE"
	if _needs_repair_synthesis():
		return "SYNTHESIS"
	if _in_signal_verification_guidance():
		var verification: Dictionary = state.math_state.get("signal_verification", {})
		var retained: Array = verification.get("retained_channels", [])
		if not bool(verification.get("maintenance_locked", false)):
			return "MAINTENANCE"
		if not bool(verification.get("weak_locked", false)):
			return "WEAK"
		if bool(verification.get("sealed", false)):
			return ""
		return "KEEP_FINAL" if retained.size() == 1 else "KEEP_GATES"
	if _in_measurement_guidance():
		if not bool(state.math_state.get("probe_prepared", false)):
			return ""
		match str(state.math_state.get("measurement_stage", "origin")):
			"origin":
				return "ORIGIN"
			"echo":
				return "CALIPER"
			"blockade":
				return "BLOCKADE"
			"windows":
				return "WINDOWS"
			_:
				return "REPAIR"
	if "DED-004" in state.unlocked_deduction_ids and state.world_state != "POWER_RESTORED":
		return "REPAIR"
	return ""

func _needs_repair_synthesis() -> bool:
	if bool(state.investigation_state.get("repair_synthesis_complete", false)) or "DED-004" in state.unlocked_deduction_ids:
		return false
	if "DED-003" not in state.unlocked_deduction_ids:
		return false
	for clue_id in ["CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		if clue_id not in state.observed_clue_ids:
			return false
	return true

func _in_measurement_guidance() -> bool:
	if "DED-004" not in state.unlocked_deduction_ids:
		return false
	if bool(state.math_state.get("window_locked", false)):
		return false
	return bool(state.device_state.get("b_isolated", false))

func _in_signal_verification_guidance() -> bool:
	return state.current_view == "SIGNAL_VERIFY" or (
		state.world_state == "POWER_RESTORED"
		and bool(state.math_state.get("window_locked", false))
		and not bool(state.math_state.get("signal_verification", {}).get("sealed", false))
	)

func _has_flashlight_guidance() -> bool:
	if flashlight != null:
		return flashlight.active
	return "ITM-G01-001" in state.inventory_item_ids or "ITM-G01-001" in state.installed_item_ids

func _prepare_narrative_ui() -> void:
	var continuity: Dictionary = scene_data.get("continuity", {})
	var beats: Array = continuity.get("opening_beats", [])
	if beats.size() == 2:
		$UI/IncidentBrief/Text.text = "%s · %s\n%s · %s" % [
			beats[0].get("channel", ""), beats[0].get("text", ""),
			beats[1].get("channel", ""), beats[1].get("text", ""),
		]
	incident_brief.visible = state.world_state == "BLACKOUT" and state.observed_clue_ids.is_empty() and "ITM-G01-001" not in state.inventory_item_ids
	if incident_brief.visible:
		incident_brief.modulate = Color.WHITE
		var opening_tween = create_tween()
		opening_tween.tween_interval(4.8)
		opening_tween.tween_property(incident_brief, "modulate:a", 0.0, 0.45)
		opening_tween.tween_callback(func(): incident_brief.visible = false)
	dual_signal_verification.visible = false

func _mark_progress() -> void:
	hint_service.mark_progress()

func _set_exploration_hud_visible(value: bool) -> void:
	var modal_guidance_active := not value and _shows_modal_guidance()
	$UI/ObjectivePanel.visible = value or modal_guidance_active
	$UI/StatusStrip.visible = value or modal_guidance_active
	$UI/HintDock.visible = (value or modal_guidance_active) and state.scene_phase != "SLICE_COMPLETE"
	$UI/BoardButton.visible = value and state.scene_phase != "SLICE_COMPLETE"
	$UI/CabinetReturn.visible = value and cabinet_world.visible
	if not value:
		deduction_board.visible = false
		if toast_tween != null and toast_tween.is_valid():
			toast_tween.kill()
		discovery_toast.visible = false
		discovery_toast.modulate.a = 0.0

func _shows_modal_guidance() -> bool:
	return state != null and state.scene_phase != "SLICE_COMPLETE" and state.current_view in ["EVIDENCE", "POWER_PANEL", "SIGNAL_VERIFY"]

func _set_cockpit_hotspots_pickable(value: bool) -> void:
	for hotspot_path in COCKPIT_HOTSPOT_PATHS:
		var hotspot := get_node_or_null(hotspot_path) as Area2D
		if hotspot != null:
			hotspot.input_pickable = value

func _toast(message: String) -> void:
	# Close-ups need unobstructed labels and mechanisms. A mouse-up from the
	# board or scene HUD can arrive after the close-up opens, so reject late
	# hint/toast click-through instead of covering the device.
	if state.current_view in ["EVIDENCE", "CABINET", "POWER_PANEL", "SIGNAL_VERIFY"] or state.scene_phase == "SLICE_COMPLETE":
		return
	if toast_tween != null and toast_tween.is_valid():
		toast_tween.kill()
	discovery_toast.visible = true
	discovery_toast.modulate = Color(1, 1, 1, 0)
	$UI/DiscoveryToast/Text.text = message
	toast_tween = create_tween()
	toast_tween.tween_property(discovery_toast, "modulate:a", 1.0, 0.18)
	toast_tween.tween_interval(2.9)
	toast_tween.tween_property(discovery_toast, "modulate:a", 0.0, 0.35)
	toast_tween.tween_callback(func(): discovery_toast.visible = false)

func _entry_title(id: String) -> String:
	for section in ["clues", "deductions", "items"]:
		for entry in scene_data.get(section, []):
			if entry.get("id") == id:
				return str(entry.get("title", entry.get("name", id)))
	return id

func _entry_text(id: String) -> String:
	for section in ["clues", "deductions"]:
		for entry in scene_data.get(section, []):
			if entry.get("id") == id:
				return str(entry.get("text", ""))
	return ""

func _play_ui_tone(frequency: float, duration: float, amplitude: float) -> void:
	$UI/UISynth.play()
	var playback = $UI/UISynth.get_stream_playback()
	if playback == null:
		return
	var sample_rate = 22050.0
	var frames = int(sample_rate * duration)
	for index in frames:
		var envelope = 1.0 - float(index) / float(frames)
		var sample = (sin(TAU * frequency * float(index) / sample_rate) + sin(TAU * frequency * 0.5 * float(index) / sample_rate) * 0.32) * amplitude * envelope
		playback.push_frame(Vector2(sample, sample))

func _save() -> void:
	var error = save_service.save_state(state)
	if error != OK:
		status_label.text = "调查记录未能写入磁盘（错误 %d）。当前会话仍可继续。" % error
