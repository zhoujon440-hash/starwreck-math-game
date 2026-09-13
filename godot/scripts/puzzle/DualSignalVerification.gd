class_name DualSignalVerification
extends Control

signal verification_completed
signal state_changed
signal channel_revealed(channel: String)

const PUZZLE_SCRIPT = preload("res://scripts/puzzle/DualSignalVerificationPuzzle.gd")

var state: RefCounted
var puzzle: RefCounted
var ending_signals: Array = []
var completion_emitted := false
var invalid_feedback_tween: Tween

func _ready() -> void:
	$MaintenanceCarrier/GainWheel/Decrease.pressed.connect(adjust_gain.bind("maintenance", -1))
	$MaintenanceCarrier/GainWheel/Increase.pressed.connect(adjust_gain.bind("maintenance", 1))
	$MaintenanceCarrier/LockPaddle.pressed.connect(lock_channel.bind("maintenance"))
	$WeakCarrier/GainWheel/Decrease.pressed.connect(adjust_gain.bind("weak", -1))
	$WeakCarrier/GainWheel/Increase.pressed.connect(adjust_gain.bind("weak", 1))
	$WeakCarrier/PhaseWheel/Reverse.pressed.connect(_step_weak_phase.bind(-1))
	$WeakCarrier/PhaseWheel/Advance.pressed.connect(_step_weak_phase.bind(1))
	$WeakCarrier/LockPaddle.pressed.connect(lock_channel.bind("weak"))
	$KeepGates/MaintenanceGate.toggled.connect(_on_keep_gate_toggled.bind("maintenance"))
	$KeepGates/WeakGate.toggled.connect(_on_keep_gate_toggled.bind("weak"))
	$SealLever.pressed.connect(seal_record)

func setup(game_state: RefCounted, receiver_config: Dictionary, signals: Array) -> void:
	state = game_state
	puzzle = PUZZLE_SCRIPT.new(state, receiver_config)
	ending_signals = signals.duplicate(true)
	completion_emitted = bool(state.math_state["signal_verification"]["sealed"])
	_populate_signal_copy()
	_refresh_visuals()

func adjust_gain(channel: String, direction: int) -> Dictionary:
	if puzzle == null:
		return _unavailable()
	var result: Dictionary = puzzle.adjust_gain(channel, direction)
	_apply_result(result)
	return result

func set_weak_phase(tick: int) -> Dictionary:
	if puzzle == null:
		return _unavailable()
	var result: Dictionary = puzzle.set_weak_phase(tick)
	_apply_result(result)
	return result

func lock_channel(channel: String) -> Dictionary:
	if puzzle == null:
		return _unavailable()
	var result: Dictionary = puzzle.lock_channel(channel)
	_apply_result(result)
	return result

func set_retained(channel: String, retained: bool) -> Dictionary:
	if puzzle == null:
		return _unavailable()
	var result: Dictionary = puzzle.set_retained(channel, retained)
	_apply_result(result)
	return result

func _on_keep_gate_toggled(retained: bool, channel: String) -> void:
	set_retained(channel, retained)

func seal_record() -> Dictionary:
	if puzzle == null:
		return _unavailable()
	var was_sealed := bool(state.math_state["signal_verification"]["sealed"])
	var result: Dictionary = puzzle.seal_record()
	_apply_result(result)
	if result.ok and result.completed and not was_sealed and not completion_emitted:
		completion_emitted = true
		verification_completed.emit()
	return result

func _step_weak_phase(direction: int) -> void:
	if state == null:
		return
	var current := int(state.math_state["signal_verification"]["weak_phase"])
	set_weak_phase(posmod(current + direction, 12))

func _apply_result(result: Dictionary) -> void:
	_refresh_visuals()
	var feedback := str(result.get("feedback", ""))
	if result.get("ok", false):
		_feedback_success(feedback)
		state_changed.emit()
		var revealed := str(result.get("revealed_channel", ""))
		if not revealed.is_empty():
			channel_revealed.emit(revealed)
	else:
		_feedback_invalid(feedback)

func _populate_signal_copy() -> void:
	if ending_signals.size() != 2:
		return
	var maintenance: Dictionary = ending_signals[0]
	var weak: Dictionary = ending_signals[1]
	$MaintenanceCarrier/Message.text = "%s · %s\n%s" % [maintenance.get("channel", "AUTO-MAINT"), maintenance.get("timbre", "稳定窄带 · 自动维护广播"), maintenance.get("text", "")]
	$WeakCarrier/Message.text = "%s · %s · SENDER %s\n%s" % [weak.get("channel", "WEAK-INTERVENTION"), weak.get("timbre", "衰减宽带 · 未知干预"), weak.get("sender", "UNKNOWN"), weak.get("text", "")]

func _refresh_visuals() -> void:
	if state == null:
		return
	var verification: Dictionary = state.math_state["signal_verification"]
	var maintenance_locked := bool(verification["maintenance_locked"])
	var weak_locked := bool(verification["weak_locked"])
	var sealed := bool(verification["sealed"])
	$MaintenanceCarrier/GainReadout.text = "增益 %d" % int(verification["maintenance_gain"])
	$WeakCarrier/GainReadout.text = "增益 %d" % int(verification["weak_gain"])
	$WeakCarrier/PhaseReadout.text = "相位 %d / 12" % int(verification["weak_phase"])
	$MaintenanceCarrier/Waveform.configure(int(verification["maintenance_gain"]), PUZZLE_SCRIPT.MAINTENANCE_GAIN_TARGET, 0, 0, false)
	$WeakCarrier/Waveform.configure(int(verification["weak_gain"]), PUZZLE_SCRIPT.WEAK_GAIN_TARGET, int(verification["weak_phase"]), puzzle._expected_weak_phase(), true)
	$MaintenanceCarrier/Message.visible = maintenance_locked
	$WeakCarrier/Message.visible = weak_locked
	$MaintenanceCarrier/LockLamp.color = Color(0.16, 0.88, 0.72, 1) if maintenance_locked else Color(0.12, 0.2, 0.22, 1)
	$WeakCarrier/LockLamp.color = Color(0.94, 0.58, 0.28, 1) if weak_locked else Color(0.2, 0.14, 0.1, 1)
	for path in ["MaintenanceCarrier/GainWheel/Decrease", "MaintenanceCarrier/GainWheel/Increase", "MaintenanceCarrier/LockPaddle"]:
		get_node(path).disabled = maintenance_locked or sealed
	for path in ["WeakCarrier/GainWheel/Decrease", "WeakCarrier/GainWheel/Increase", "WeakCarrier/PhaseWheel/Reverse", "WeakCarrier/PhaseWheel/Advance", "WeakCarrier/LockPaddle"]:
		get_node(path).disabled = weak_locked or sealed
	$WeakCarrier/LockPaddle.disabled = not maintenance_locked or weak_locked or sealed
	var retained: Array = verification["retained_channels"]
	$KeepGates/MaintenanceGate.set_pressed_no_signal("maintenance" in retained)
	$KeepGates/WeakGate.set_pressed_no_signal("weak" in retained)
	$KeepGates/MaintenanceGate.disabled = not maintenance_locked or sealed
	$KeepGates/WeakGate.disabled = not weak_locked or sealed
	$SealLever.disabled = sealed
	$SealLamp.color = Color(0.22, 0.95, 0.78, 1) if sealed else Color(0.3, 0.2, 0.08, 1)
	$Housing/SealBar.visible = sealed

func _feedback_success(code: String) -> void:
	$FeedbackReadout.text = _feedback_copy(code)
	$FeedbackReadout.modulate = Color(0.58, 0.96, 0.88, 1)
	_play_tone(420.0 if code != "RECORD_SEALED" else 620.0, 0.09, 0.11)

func _feedback_invalid(code: String) -> void:
	$FeedbackReadout.text = _feedback_copy(code)
	$FeedbackReadout.modulate = Color(1.0, 0.48, 0.3, 1)
	if invalid_feedback_tween != null and invalid_feedback_tween.is_valid():
		invalid_feedback_tween.kill()
	position = Vector2.ZERO
	invalid_feedback_tween = create_tween()
	invalid_feedback_tween.tween_property(self, "position", Vector2(7, 0), 0.045)
	invalid_feedback_tween.tween_property(self, "position", Vector2(-5, 0), 0.045)
	invalid_feedback_tween.tween_property(self, "position", Vector2.ZERO, 0.07)
	_play_tone(112.0, 0.12, 0.16)

func _feedback_copy(code: String) -> String:
	return {
		"GAIN_ADJUSTED": "增益轮停入下一档；锁框等待稳定载波。",
		"WEAK_PHASE_SET": "弱路相位环停入下一格；前缘仍需复核。",
		"MAINTENANCE_GAIN_MISMATCH": "维护载波尚未进入绿色参考框；旋钮位置保持。",
		"MAINTENANCE_CHANNEL_REQUIRED": "先锁定自动维护窄带，再分离它前缘的弱回波。",
		"WEAK_GAIN_MISMATCH": "弱回波波峰未落入绿色参考带；旋钮位置保持。",
		"WEAK_PHASE_MISMATCH": "弱路前缘没有落在提前一格的位置；相位轮保持。",
		"MAINTENANCE_LOCKED": "自动维护载波锁定；第一条记录已显影。",
		"WEAK_LOCKED": "弱干预回波锁定；第二条记录已显影。",
		"RETAIN_GATE_SET": "机械保留闸已改变；两路记录仍彼此独立。",
		"BOTH_RECORDS_REQUIRED": "七码拒绝封存：两枚保留闸必须同时压下。",
		"RECORD_SEALED": "双路记录封存完成。",
		"RECORD_ALREADY_SEALED": "封存条已经落锁。",
	}.get(code, code)

func _play_tone(frequency: float, duration: float, amplitude: float) -> void:
	if not is_inside_tree():
		return
	$ReceiverAudio.play()
	var playback = $ReceiverAudio.get_stream_playback()
	if playback == null:
		return
	var sample_rate := 22050.0
	var frames := int(sample_rate * duration)
	for index in frames:
		var envelope := 1.0 - float(index) / float(frames)
		var sample := sin(TAU * frequency * float(index) / sample_rate) * amplitude * envelope
		playback.push_frame(Vector2(sample, sample))

func _unavailable() -> Dictionary:
	return {"ok": false, "completed": false, "feedback": "SIGNAL_RECEIVER_NOT_READY", "revealed_channel": ""}

func _exit_tree() -> void:
	$ReceiverAudio.stop()
	$ReceiverAudio.stream = null
