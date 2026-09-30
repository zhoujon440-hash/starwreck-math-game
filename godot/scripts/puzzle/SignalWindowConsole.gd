class_name SignalWindowConsole
extends Node2D

signal state_changed
signal diagnostic_completed
signal device_feedback(code: String)

const TOOL_IDS := {
	"wrench": "ITM-G01-003",
	"gloves": "ITM-G01-004",
}

var state: RefCounted
var inventory_service: RefCounted
var config: Dictionary = {}
var puzzle: RefCounted
var progress_service: RefCounted
var tool_seated := {"wrench": false, "gloves": false}
var console_anchor := Vector2.ZERO
var feedback_tween: Tween
var local_feedback_tween: Tween
var success_tween: Tween
var last_feedback_code := ""

func setup(game_state: RefCounted, inventory_service: RefCounted, config: Dictionary) -> void:
	state = game_state
	self.inventory_service = inventory_service
	self.config = _normalize_config(config)
	puzzle = preload("res://scripts/puzzle/SignalWindowPuzzle.gd").new(state, self.config)
	progress_service = preload("res://scripts/math/MathProgressService.gd").new(state)
	if state.math_state.get("probe_prepared", false):
		tool_seated["wrench"] = true
		tool_seated["gloves"] = true
	_refresh_visuals()

func activate_probe_tool(tool_name: String) -> Dictionary:
	if state == null or tool_name not in TOOL_IDS:
		return _local_failure("PROBE_UNSAFE")
	var item_id: String = TOOL_IDS[tool_name]
	if item_id not in state.inventory_item_ids and item_id not in state.installed_item_ids:
		return _local_failure("PROBE_UNSAFE")
	tool_seated[tool_name] = true
	_refresh_visuals()
	if not tool_seated["wrench"] or not tool_seated["gloves"]:
		$Readout.text = "探针座等待另一件绝缘工具 · PROBE HALF-SEATED"
		device_feedback.emit("PROBE_TOOL_SEATED")
		return _result(true, "PROBE_TOOL_SEATED")
	var result: Dictionary = puzzle.prepare_probe(true, true)
	if result.ok:
		_refresh_visuals()
		state_changed.emit()
		_feedback_local_success("双工具探针已固定 · OBSERVE THREE CYCLES")
	else:
		_feedback_failure(str(result.feedback))
	return result

func adjust_origin(direction: int) -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	var next_tick := posmod(int(state.math_state["origin_tick"]) + (1 if direction >= 0 else -1), int(config["cycle_size"]))
	var result: Dictionary = puzzle.set_origin_tick(next_tick)
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("ORIGIN_WHEEL_STEP", 248.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func confirm_origin() -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	var result: Dictionary = puzzle.confirm_origin()
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("ORIGIN_CONFIRMED", 286.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func adjust_echo_jaw(jaw: String, direction: int) -> Dictionary:
	if puzzle == null or jaw not in ["pulse", "echo"]:
		return _local_failure("ECHO_OFFSET_MISMATCH")
	var measurement: Dictionary = state.math_state["echo_measurement"]
	var pulse_tick := int(measurement["pulse"])
	var echo_tick := int(measurement["echo"])
	if jaw == "pulse":
		var candidates: Array = config["maintenance_pulses"]
		var candidate_index := candidates.find(pulse_tick)
		candidate_index = posmod(candidate_index + (1 if direction >= 0 else -1), candidates.size()) if candidate_index >= 0 else (0 if direction >= 0 else candidates.size() - 1)
		pulse_tick = int(candidates[candidate_index])
	else:
		echo_tick = posmod(echo_tick + (1 if direction >= 0 else -1), int(config["cycle_size"]))
	var result: Dictionary = puzzle.set_echo_caliper(pulse_tick, echo_tick)
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("CALIPER_JAW_STEP", 332.0 if jaw == "pulse" else 358.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func confirm_echo() -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	var result: Dictionary = puzzle.confirm_echo_measurement()
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("ECHO_MEASUREMENT_CONFIRMED", 392.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func toggle_blockade_slot(tick: int) -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	var result: Dictionary = puzzle.toggle_blockade_mark(tick)
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("BLOCKADE_MARK_TOGGLE", 438.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func confirm_blockade() -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	var result: Dictionary = puzzle.confirm_blockade_overlay()
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_stage_feedback("BLOCKADE_OVERLAY_CONFIRMED", 474.0)
	else:
		_feedback_failure(str(result.feedback))
	return result

func advance_window(index: int, direction := 1) -> Dictionary:
	if puzzle == null or index < 0 or index >= int(config.get("window_count", 0)):
		return _local_failure("PHASE_MISMATCH")
	if not state.math_state.get("probe_prepared", false):
		return _local_failure("PROBE_UNSAFE")
	if int(state.math_state.get("observed_cycles", 0)) < int(config.get("required_observation_cycles", 3)):
		return _local_failure("OBSERVATION_INCOMPLETE")
	var current := int(state.math_state["sample_windows"][index])
	var next_tick := posmod(current + (1 if direction >= 0 else -1), int(config["cycle_size"]))
	var result: Dictionary = puzzle.set_window(index, next_tick)
	state_changed.emit()
	if result.ok:
		_refresh_visuals()
		_snap_window(index)
	else:
		_feedback_failure(str(result.feedback))
	return result

func engage_lock() -> Dictionary:
	if puzzle == null:
		return _local_failure("PROBE_UNSAFE")
	if state.math_state.get("window_locked", false):
		return _result(true, "DIAGNOSTIC_COMPLETE", true)
	var result: Dictionary = puzzle.lock_windows(bool(state.device_state.get("b_isolated", false)))
	state_changed.emit()
	if not result.ok:
		_feedback_failure(str(result.feedback))
		return result
	_refresh_visuals()
	_feedback_success()
	diagnostic_completed.emit()
	return _result(true, "DIAGNOSTIC_COMPLETE", true)

func _ready() -> void:
	console_anchor = position
	$ProbeWrench.input_event.connect(_on_probe_input.bind("wrench"))
	$ProbeGloves.input_event.connect(_on_probe_input.bind("gloves"))
	$OriginWheel/Marker.input_event.connect(_on_origin_wheel_input)
	$OriginWheel/LockPin.input_event.connect(_on_origin_lock_input)
	$EchoCaliper/PulseJaw.input_event.connect(_on_echo_jaw_input.bind("pulse"))
	$EchoCaliper/EchoJaw.input_event.connect(_on_echo_jaw_input.bind("echo"))
	$EchoCaliper/MeasureLever.input_event.connect(_on_echo_lever_input)
	for tick in 12:
		get_node("BlockadeOverlay/Slot%02d" % tick).input_event.connect(_on_blockade_slot_input.bind(tick))
	$BlockadeOverlay/Clamp.input_event.connect(_on_blockade_clamp_input)
	for index in 3:
		get_node("Window%d" % index).input_event.connect(_on_window_input.bind(index))
	$LockLever.input_event.connect(_on_lock_input)
	$ReturnButton.pressed.connect(_on_return_pressed)

func _exit_tree() -> void:
	if has_node("ConsoleAudio"):
		$ConsoleAudio.stop()
		$ConsoleAudio.stream = null

func _on_probe_input(_viewport: Node, event: InputEvent, _shape_idx: int, tool_name: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		activate_probe_tool(tool_name)

func _on_origin_wheel_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			adjust_origin(1)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			adjust_origin(-1)

func _on_origin_lock_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		confirm_origin()

func _on_echo_jaw_input(_viewport: Node, event: InputEvent, _shape_idx: int, jaw: String) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			adjust_echo_jaw(jaw, 1)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			adjust_echo_jaw(jaw, -1)

func _on_echo_lever_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		confirm_echo()

func _on_blockade_slot_input(_viewport: Node, event: InputEvent, _shape_idx: int, tick: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		toggle_blockade_slot(tick)

func _on_blockade_clamp_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		confirm_blockade()

func _on_window_input(_viewport: Node, event: InputEvent, _shape_idx: int, index: int) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			advance_window(index, 1)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			advance_window(index, -1)

func _on_lock_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		$LockLever/Handle.rotation = 0.62
		engage_lock()

func _on_return_pressed() -> void:
	if state != null and state.math_state.get("window_locked", false):
		visible = false
		device_feedback.emit("DIAGNOSTIC_TRAY_RETRACTED")
	else:
		_feedback_failure("DIAGNOSTIC_ACTIVE")

func _local_failure(code: String) -> Dictionary:
	if progress_service != null:
		progress_service.record_attempt(code)
	state_changed.emit()
	_feedback_failure(code)
	return _result(false, code)

func _result(ok: bool, feedback: String, completed := false) -> Dictionary:
	return {"ok": ok, "feedback": feedback, "completed": completed}

func _normalize_config(source: Dictionary) -> Dictionary:
	var normalized := source.duplicate(true)
	for key in ["cycle_size", "weak_echo_offset", "origin_tick", "required_observation_cycles", "window_count", "window_spacing"]:
		normalized[key] = int(normalized.get(key, 0))
	for key in ["maintenance_pulses", "blockade_slots"]:
		var values: Array = []
		for value in normalized.get(key, []):
			values.append(int(value))
		normalized[key] = values
	var pulses: Array = normalized["maintenance_pulses"]
	normalized["echo_caliper_pulse"] = int(source.get("echo_caliper_pulse", pulses[1] if pulses.size() > 1 else 0))
	return normalized

func _refresh_visuals() -> void:
	if state == null:
		return
	var prepared := bool(state.math_state.get("probe_prepared", false))
	var stage := str(state.math_state.get("measurement_stage", "origin"))
	$ProbeWrench/Socket.color = Color(0.18, 0.58, 0.5, 1) if tool_seated["wrench"] else Color(0.12, 0.17, 0.17, 1)
	$ProbeGloves/Socket.color = Color(0.18, 0.58, 0.5, 1) if tool_seated["gloves"] else Color(0.12, 0.17, 0.17, 1)
	$CycleDrum.visible = prepared and stage != "origin"
	$CycleDrum.input_pickable = false
	for index in 3:
		var pulse_tick := int(config["maintenance_pulses"][index])
		var echo_tick := posmod(pulse_tick + int(config["weak_echo_offset"]), int(config["cycle_size"]))
		var pulse = get_node("CycleDrum/Tape/Pulse%d" % index)
		var echo = get_node("CycleDrum/Tape/Echo%d" % index)
		pulse.visible = true
		echo.visible = true
		pulse.position.x = -110.0 + float(pulse_tick * 20)
		echo.position.x = -110.0 + float(echo_tick * 20)
	for tick in 12:
		var occupied: bool = tick in config["blockade_slots"] and stage in ["blockade", "windows", "complete"]
		get_node("CycleDrum/Tape/PhaseScale/Tick%02d" % tick).default_color = Color(0.9, 0.08, 0.025, 1) if occupied else Color(0.12, 0.09, 0.055, 0.95)
		var number: Label = get_node("CycleDrum/Tape/PhaseScale/Number%02d" % tick)
		number.position.x = -110.0 + float(tick * 20) - number.size.x * 0.5
	var origin_active := prepared and stage == "origin"
	$OriginWheel.visible = origin_active
	$OriginWheel/Marker.visible = origin_active
	$OriginWheel/LockPin.visible = origin_active
	$OriginWheel/Marker.input_pickable = origin_active
	$OriginWheel/LockPin.input_pickable = origin_active
	$OriginWheel/Marker.rotation = deg_to_rad(float(int(state.math_state["origin_tick"]) * 30))
	$OriginWheel/TickReadout.text = "DATUM %02d" % int(state.math_state["origin_tick"])
	var echo_active := prepared and stage == "echo"
	$EchoCaliper.visible = echo_active
	$EchoCaliper/PulseJaw.visible = echo_active
	$EchoCaliper/EchoJaw.visible = echo_active
	$EchoCaliper/MeasureLever.visible = echo_active
	$EchoCaliper/PulseJaw.input_pickable = echo_active
	$EchoCaliper/EchoJaw.input_pickable = echo_active
	$EchoCaliper/MeasureLever.input_pickable = echo_active
	var echo_measurement: Dictionary = state.math_state["echo_measurement"]
	$EchoCaliper/PulseJaw/JawLabel.text = "P %02d" % int(echo_measurement["pulse"])
	$EchoCaliper/EchoJaw/JawLabel.text = "E %02d" % int(echo_measurement["echo"])
	$EchoCaliper/PulseJaw.position.x = 145.0 + float(int(echo_measurement["pulse"]) * 32)
	$EchoCaliper/EchoJaw.position.x = 145.0 + float(int(echo_measurement["echo"]) * 32)
	var blockade_active := prepared and stage == "blockade"
	$BlockadeOverlay.visible = blockade_active
	for tick in 12:
		var slot: Area2D = get_node("BlockadeOverlay/Slot%02d" % tick)
		slot.visible = blockade_active
		slot.input_pickable = blockade_active
		slot.get_node("Plate").color = Color(0.9, 0.13, 0.06, 0.9) if tick in state.math_state["blockade_marks"] else Color(0.12, 0.29, 0.3, 0.86)
	$BlockadeOverlay/Clamp.visible = blockade_active
	$BlockadeOverlay/Clamp.input_pickable = blockade_active
	var windows_visible: bool = stage == "windows" or bool(state.math_state.get("window_locked", false))
	for index in 3:
		var window: Area2D = get_node("Window%d" % index)
		var tick := int(state.math_state["sample_windows"][index])
		window.visible = windows_visible
		window.get_node("Marker").rotation = deg_to_rad(float(tick * 30))
		window.get_node("Position").text = "%s · %02d" % [String.chr(65 + index), tick]
		window.input_pickable = prepared and stage == "windows" and not state.math_state.get("window_locked", false)
	$SweepLamp.visible = windows_visible
	$LockLever.visible = windows_visible
	$LockLever.input_pickable = prepared and stage == "windows" and not state.math_state.get("window_locked", false)
	$LockLever/Handle.rotation = 0.62 if state.math_state.get("window_locked", false) else 0.0
	var tier := str(state.math_state.get("support_tier", "standard"))
	$HintGlow.visible = tier == "guided" and not state.math_state.get("completed", false)
	$GuideMarks.visible = tier == "guided"
	$GuidedTrend.visible = tier == "guided"
	$SignedRelation.visible = tier != "expert" and stage in ["blockade", "windows", "complete"]
	$EtchedEvidence.visible = true
	$RingCaption.visible = stage == "origin" or stage == "echo"
	$RingCaption.text = "绝对零点基准轮 / DATUM" if stage == "origin" else "左键前进 · 右键后退 / CALIPER"
	var evidence: Array[String] = []
	if stage in ["echo", "blockade", "windows", "complete"]:
		evidence.append("ORIGIN 0")
	if stage in ["blockade", "windows", "complete"]:
		evidence.append("ECHO −1")
	if stage in ["windows", "complete"]:
		evidence.append("BLOCK 0·3·7·8")
	$EtchedEvidence.text = "  /  ".join(evidence) if not evidence.is_empty() else "ETCHED EVIDENCE RAIL"
	for index in 3:
		get_node("Window%d/Position" % index).visible = tier != "expert"
	if state.math_state.get("window_locked", false):
		$Readout.text = "相位窗锁定 · DIAGNOSTIC PATH CLEAR"
	elif not prepared:
		$Readout.text = "安装扳手与绝缘手套固定双探针"
	elif stage == "origin":
		$Readout.text = "转动基准轮，使缺口对齐绝对零点，再压入锁销"
	elif stage == "echo":
		$Readout.text = "夹住纸带中央的维护峰与其青色前缘，再压测量杆"
	elif stage == "blockade":
		$Readout.text = "在透明覆片标记红色占用槽，再压下夹具"
	elif tier == "expert":
		$Readout.text = "PHASE SHUTTERS READY"
	else:
		$Readout.text = "逐格转动三枚采样窗，再压下机械锁杆"

func _snap_window(index: int) -> void:
	device_feedback.emit("WINDOW_SNAP")
	_play_tone(380.0 + float(index) * 45.0, 0.045, 0.09)
	if not is_inside_tree():
		return
	var marker = get_node("Window%d/Marker" % index)
	var target_scale: Vector2 = marker.scale
	var tween = create_tween()
	tween.tween_property(marker, "scale", target_scale * 0.82, 0.035)
	tween.tween_property(marker, "scale", target_scale, 0.055)

func _stage_feedback(code: String, frequency: float) -> void:
	last_feedback_code = code
	device_feedback.emit(code)
	_play_tone(frequency, 0.07, 0.1)

func _feedback_local_success(message: String) -> void:
	_cancel_active_tweens()
	position = console_anchor
	last_feedback_code = "LOCAL_OK"
	$Readout.text = message
	$AmberLamp.color = Color(0.86, 0.53, 0.12, 1)
	_play_tone(290.0, 0.06, 0.08)
	if is_inside_tree():
		local_feedback_tween = create_tween()
		local_feedback_tween.tween_property($AmberLamp, "color", Color(0.24, 0.16, 0.05, 1), 0.28)

func _feedback_failure(code: String) -> void:
	_cancel_active_tweens()
	position = console_anchor
	last_feedback_code = code
	device_feedback.emit(code)
	$Readout.text = _failure_message(code)
	$SweepLamp.default_color = Color(1.0, 0.08, 0.03, 0.95)
	$SweepLamp.rotation = -0.42
	$LockLever/Handle.rotation = -0.24
	$FailureLamp.color = Color(0.95, 0.04, 0.02, 1)
	_play_tone(96.0, 0.12, 0.16)
	if not is_inside_tree():
		$LockLever/Handle.rotation = 0.0
		return
	position = console_anchor + Vector2(-7, 2)
	feedback_tween = create_tween()
	feedback_tween.tween_property($SweepLamp, "rotation", 0.42, 0.11)
	feedback_tween.parallel().tween_property(self, "position:x", console_anchor.x + 7.0, 0.045)
	feedback_tween.tween_property(self, "position:x", console_anchor.x - 4.0, 0.045)
	feedback_tween.tween_property(self, "position", console_anchor, 0.065)
	feedback_tween.parallel().tween_property($LockLever/Handle, "rotation", 0.0, 0.14).set_trans(Tween.TRANS_BACK)
	feedback_tween.parallel().tween_property($FailureLamp, "color", Color(0.2, 0.025, 0.02, 1), 0.32)
	feedback_tween.tween_property($SweepLamp, "default_color", Color(0.23, 0.52, 0.5, 0.44), 0.24)

func _feedback_success() -> void:
	_cancel_active_tweens()
	position = console_anchor
	last_feedback_code = "DIAGNOSTIC_COMPLETE"
	device_feedback.emit("DIAGNOSTIC_COMPLETE")
	$Readout.text = "相位窗锁定 · DIAGNOSTIC PATH CLEAR"
	$FailureLamp.color = Color(0.06, 0.18, 0.12, 1)
	$SuccessLamp.color = Color(0.06, 0.9, 0.48, 1)
	$AmberLamp.color = Color(1.0, 0.62, 0.12, 1)
	$SweepLamp.default_color = Color(0.12, 1.0, 0.58, 1)
	$SweepLamp.rotation = 0.0
	$LockLever/Handle.rotation = 0.62
	_play_tone(520.0, 0.16, 0.12)
	if not is_inside_tree():
		return
	success_tween = create_tween()
	success_tween.tween_property($SweepLamp, "rotation", TAU, 0.72).set_trans(Tween.TRANS_SINE)
	success_tween.parallel().tween_property($SuccessLamp, "color", Color(0.04, 0.48, 0.28, 1), 1.0)
	success_tween.parallel().tween_property($AmberLamp, "color", Color(0.44, 0.28, 0.06, 1), 1.0)

func _cancel_active_tweens() -> void:
	for tween in [feedback_tween, local_feedback_tween, success_tween]:
		if tween != null and tween.is_valid():
			tween.kill()

func _failure_message(code: String) -> String:
	return {
		"PROBE_UNSAFE": "探针互锁 · 需要扳手与绝缘手套",
		"OBSERVATION_INCOMPLETE": "纸带节奏不足 · 继续观察完整循环",
		"MEASUREMENT_INCOMPLETE": "三段测量尚未完成 · 采样环保持锁止",
		"MEASUREMENT_STAGE_MISMATCH": "当前机械段不接受该动作",
		"ORIGIN_MISMATCH": "基准缺口未与绝对零点重合 · 锁销回弹",
		"ECHO_OFFSET_MISMATCH": "双卡尺跨度或方向不符 · 保留当前钳口",
		"BLOCKADE_MAP_INCOMPLETE": "透明覆片与红色占用槽未完全重合",
		"B_NOT_ISOLATED": "B支路仍带入封锁脉冲 · 锁杆回弹",
		"WINDOW_NOT_EQUAL": "采样窗间距不均 · 锁杆回弹",
		"BLOCKADE_COLLISION": "红色扫光撞上占用槽 · 窗位保留",
		"PHASE_MISMATCH": "维护脉冲与弱回波相位未对齐",
		"DIAGNOSTIC_ACTIVE": "诊断托盘仍在工作位",
	}.get(code, "局部互锁回弹 · %s" % code)

func _play_tone(frequency: float, duration: float, amplitude: float) -> void:
	if not is_inside_tree() or not has_node("ConsoleAudio"):
		return
	$ConsoleAudio.play()
	var playback = $ConsoleAudio.get_stream_playback()
	if playback == null:
		return
	var sample_rate := 22050.0
	var frames := int(sample_rate * duration)
	for index in frames:
		var envelope := 1.0 - float(index) / float(frames)
		var sample := sin(TAU * frequency * float(index) / sample_rate) * amplitude * envelope
		playback.push_frame(Vector2(sample, sample))
