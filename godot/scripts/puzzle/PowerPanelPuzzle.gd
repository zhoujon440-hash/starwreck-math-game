class_name PowerPanelPuzzle
extends Node2D

signal power_restored
signal milestone_reached(name: String)
signal close_requested
signal device_feedback(code: String)

var state: RefCounted = null
var inventory_service: RefCounted = null
var dragging_b := false
var dragging_coupler := false
var coupler_preview_angle := 0.0
var panel_anchor := Vector2.ZERO
var invalid_feedback_tween: Tween
var diagnostic_config: Dictionary = {}

func _init(game_state: RefCounted = null) -> void:
	state = game_state

func setup(game_state: RefCounted, service: RefCounted = null) -> void:
	state = game_state
	inventory_service = service
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00_math.json"))
	if parsed is Dictionary:
		diagnostic_config = parsed
	if has_node("SignalWindowConsole"):
		$SignalWindowConsole.setup(state, inventory_service, diagnostic_config)
	_restore_visuals()

func set_b_isolated(value: bool) -> Dictionary:
	if not _gate_open():
		return _result(false, "relay_unstable")
	state.device_state["b_isolated"] = value
	if value:
		_set_console_active(not state.math_state.get("window_locked", false))
		milestone_reached.emit("b_isolated")
		_feedback_success("B支路机械隔离 · BRANCH B ISOLATED")
	return _result(true, "mechanical_latch")

func install_fuse(item_id: String) -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false):
		return _result(false, "slot_reject")
	if not state.math_state.get("window_locked", false):
		return _result(false, "DIAGNOSTIC_REQUIRED")
	if item_id != "ITM-G01-002" or item_id not in state.inventory_item_ids:
		return _result(false, "slot_reject")
	state.inventory_item_ids.erase(item_id)
	if item_id not in state.installed_item_ids:
		state.installed_item_ids.append(item_id)
	state.device_state["fuse_installed"] = true
	if inventory_service != null:
		inventory_service.clear_selection()
	milestone_reached.emit("fuse_installed")
	_feedback_success("备用保险丝磁吸入位 · STANDBY FUSE SEATED")
	return _result(true, "magnetic_snap")

func set_coupler_angle(degrees: float) -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false) or not state.device_state.get("fuse_installed", false):
		return _result(false, "arc_recoil")
	if absf(degrees - 90.0) > 8.0:
		return _result(false, "detent_missed")
	state.device_state["coupler_angle"] = 90.0
	milestone_reached.emit("coupler_aligned")
	_feedback_success("A↔C耦合机构卡入工作位 · COUPLER LATCHED")
	return _result(true, "detent_click")

func toggle_protector() -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false) or not state.device_state.get("fuse_installed", false) or absf(float(state.device_state.get("coupler_angle", 0.0)) - 90.0) > 8.0:
		return _result(false, "protector_spring_return")
	state.device_state["protector_on"] = true
	state.world_state = "POWER_RESTORED"
	_feedback_success("总保护闭合 · POWER BUS STABLE")
	power_restored.emit()
	return _result(true, "power_latched", true)

func _gate_open() -> bool:
	return state != null and "DED-004" in state.unlocked_deduction_ids

func _result(ok: bool, feedback: String, completed := false) -> Dictionary:
	return {"ok": ok, "feedback": feedback, "completed": completed}

func _ready() -> void:
	panel_anchor = position
	if has_node("BIsolationLever"):
		$BIsolationLever.input_event.connect(_on_b_input)
		$StandbyFuseSlot.input_event.connect(_on_fuse_slot_input)
		$CouplerKnob.input_event.connect(_on_coupler_input)
		$ProtectorLever.input_event.connect(_on_protector_input)
		$StandbyFuseSlot/DropTarget.item_dropped.connect(_on_fuse_item_dropped)
		$Close.pressed.connect(func(): close_requested.emit())
		$SignalWindowConsole.state_changed.connect(_on_console_state_changed)
		$SignalWindowConsole.diagnostic_completed.connect(_on_diagnostic_completed)
		$SignalWindowConsole.device_feedback.connect(_on_console_device_feedback)
		$SignalWindowConsole.get_node("ReturnButton").pressed.connect(_on_console_return_pressed)

func _exit_tree() -> void:
	if has_node("DeviceAudio"):
		$DeviceAudio.stop()
		$DeviceAudio.stream = null

func _on_b_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_b = event.pressed
		if not event.pressed:
			var isolated = $BIsolationLever/Handle.position.y > 10.0
			var result = set_b_isolated(isolated)
			$BIsolationLever/Handle.position.y = 82.0 if result.ok and isolated else -72.0
			if not result.ok:
				_feedback_invalid("SAFETY INTERLOCK · LOGIC REQUIRED")
	if event is InputEventMouseMotion and dragging_b:
		$BIsolationLever/Handle.position.y = clampf($BIsolationLever/Handle.position.y + event.relative.y, -72.0, 82.0)

func _on_fuse_slot_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and state != null:
		var selected = str(inventory_service.selected_item_id) if inventory_service != null else ""
		var result = install_fuse(selected)
		if result.ok:
			$StandbyFuseSlot/FuseInserted.visible = true
		else:
			_feedback_invalid("DIAGNOSTIC REQUIRED · FUSE RETURNED" if result.feedback == "DIAGNOSTIC_REQUIRED" else "SLOT REJECT · ITEM RETURNED")

func _on_fuse_item_dropped(item_id: String) -> void:
	var result = install_fuse(item_id)
	if result.ok:
		$StandbyFuseSlot/FuseInserted.visible = true
	else:
		_feedback_invalid("DIAGNOSTIC REQUIRED · FUSE RETURNED" if result.feedback == "DIAGNOSTIC_REQUIRED" else "SLOT REJECT · ITEM RETURNED")

func _on_console_state_changed() -> void:
	milestone_reached.emit("diagnostic_progress")

func _on_diagnostic_completed() -> void:
	milestone_reached.emit("diagnostic_completed")
	if is_inside_tree():
		var retract = create_tween()
		retract.tween_interval(0.9)
		retract.tween_callback(_set_console_active.bind(false))

func _on_console_device_feedback(code: String) -> void:
	device_feedback.emit(code)

func _on_console_return_pressed() -> void:
	if state != null and state.math_state.get("completed", false):
		_set_console_active(false)

func _on_coupler_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_coupler = event.pressed
		if not event.pressed:
			var result = set_coupler_angle(rad_to_deg(coupler_preview_angle))
			coupler_preview_angle = deg_to_rad(float(state.device_state.get("coupler_angle", 0.0)))
			$CouplerKnob/Dial.rotation = coupler_preview_angle
			$CouplerKnob/Needle.rotation = coupler_preview_angle
			if not result.ok:
				_feedback_invalid("COUPLER RECOIL · CIRCUIT UNSAFE")
	if event is InputEventMouseMotion and dragging_coupler:
		coupler_preview_angle = clampf(coupler_preview_angle + event.relative.x * 0.012, 0.0, deg_to_rad(110.0))
		$CouplerKnob/Dial.rotation = coupler_preview_angle
		$CouplerKnob/Needle.rotation = coupler_preview_angle

func _on_protector_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var result = toggle_protector()
		$ProtectorLever/Handle.rotation = 0.6 if result.ok else 0.0
		if not result.ok:
			_feedback_invalid("PROTECTOR TRIP · CIRCUIT UNSTABLE")

func _feedback_invalid(code := "CIRCUIT UNSTABLE") -> void:
	if not has_node("StatusLamp"):
		return
	if invalid_feedback_tween != null and invalid_feedback_tween.is_valid():
		invalid_feedback_tween.kill()
	position = panel_anchor
	device_feedback.emit(code)
	$DeviceReadout.text = code
	$StatusLamp.color = Color(1, 0.05, 0.02, 1)
	$FeedbackArc.visible = true
	_play_tone(92.0, 0.16, 0.22)
	position = panel_anchor + Vector2(-8, 2)
	invalid_feedback_tween = create_tween()
	invalid_feedback_tween.tween_property(self, "position", panel_anchor + Vector2(7, -2), 0.045)
	invalid_feedback_tween.tween_property(self, "position", panel_anchor, 0.07)
	invalid_feedback_tween.parallel().tween_property($StatusLamp, "color", Color(0.18, 0.035, 0.03, 1), 0.38)
	invalid_feedback_tween.tween_callback(func(): $FeedbackArc.visible = false)

func _feedback_success(message: String) -> void:
	if not has_node("StatusLamp"):
		return
	$DeviceReadout.text = message
	$StatusLamp.color = Color(0.08, 0.72, 0.65, 1)
	_play_tone(320.0, 0.08, 0.16)
	var tween = create_tween()
	tween.tween_property($StatusLamp, "color", Color(0.04, 0.28, 0.26, 1), 0.42)

func _play_tone(frequency: float, duration: float, amplitude: float) -> void:
	if not has_node("DeviceAudio"):
		return
	$DeviceAudio.play()
	var playback = $DeviceAudio.get_stream_playback()
	if playback == null:
		return
	var sample_rate = 22050.0
	var frames = int(sample_rate * duration)
	for index in frames:
		var envelope = 1.0 - float(index) / float(frames)
		var sample = sin(TAU * frequency * float(index) / sample_rate) * amplitude * envelope
		playback.push_frame(Vector2(sample, sample))

func _restore_visuals() -> void:
	if state == null or not has_node("BIsolationLever"):
		return
	$BIsolationLever/Handle.position.y = 82.0 if state.device_state.get("b_isolated", false) else -72.0
	$StandbyFuseSlot/FuseInserted.visible = state.device_state.get("fuse_installed", false)
	coupler_preview_angle = deg_to_rad(float(state.device_state.get("coupler_angle", 0.0)))
	$CouplerKnob/Dial.rotation = coupler_preview_angle
	$CouplerKnob/Needle.rotation = coupler_preview_angle
	$ProtectorLever/Handle.rotation = 0.6 if state.device_state.get("protector_on", false) else 0.0
	_set_console_active(state.device_state.get("b_isolated", false) and not state.math_state.get("window_locked", false))

func _set_console_active(active: bool) -> void:
	if not has_node("SignalWindowConsole"):
		return
	$SignalWindowConsole.visible = active
	$BIsolationLever.input_pickable = not active
	$StandbyFuseSlot.input_pickable = not active
	$StandbyFuseSlot/DropTarget.mouse_filter = Control.MOUSE_FILTER_IGNORE if active else Control.MOUSE_FILTER_PASS
	$CouplerKnob.input_pickable = not active
	$ProtectorLever.input_pickable = not active
