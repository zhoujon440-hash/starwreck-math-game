extends RefCounted

const PUZZLE_SCRIPT = preload("res://scripts/puzzle/DualSignalVerificationPuzzle.gd")
const RECEIVER_SCENE = preload("res://scenes/g01/DualSignalVerification.tscn")
const CONFIG := {
	"cycle_size": 12,
	"weak_echo_offset": -1,
}

func run(t) -> void:
	_test_requires_restored_diagnostic(t)
	_test_maintenance_must_lock_first(t)
	_test_weak_errors_preserve_controls(t)
	_test_two_independent_retains_seal_once(t)
	_test_receiver_contract_and_completion_boundary(t)
	_test_partial_receiver_state_round_trips_strictly(t)
	_test_tuning_changes_visible_signal_before_lock(t)

func _test_tuning_changes_visible_signal_before_lock(t) -> void:
	var receiver = RECEIVER_SCENE.instantiate()
	receiver.setup(_ready_state(), CONFIG, [])
	var maintenance = receiver.get_node("MaintenanceCarrier/Waveform")
	var weak = receiver.get_node("WeakCarrier/Waveform")
	t.truthy(maintenance.has_method("signal_points") and weak.has_method("signal_points"), "receiver must show a measured trace, not an unchanging waveform label")
	if not maintenance.has_method("signal_points") or not weak.has_method("signal_points"):
		receiver.free()
		return
	var low_trace: PackedVector2Array = maintenance.signal_points()
	receiver.adjust_gain("maintenance", 1)
	t.truthy(maintenance.signal_points() != low_trace, "gain wheel must move the visible trace before a lock attempt")
	t.truthy(not maintenance.peak_in_reference_band(), "under-amplified trace remains below the reference band")
	receiver.adjust_gain("maintenance", 1)
	receiver.adjust_gain("maintenance", 1)
	t.truthy(maintenance.peak_in_reference_band(), "maintenance gain three reaches the visible reference band")
	t.truthy(not receiver.state.math_state["signal_verification"]["maintenance_locked"], "visual alignment must not auto-lock the carrier")
	receiver.adjust_gain("weak", 1)
	receiver.adjust_gain("weak", 1)
	t.truthy(weak.peak_in_reference_band(), "weak gain two reaches its amplitude band")
	receiver.adjust_gain("weak", 1)
	t.truthy(not weak.peak_in_reference_band(), "over-amplified weak trace visibly overshoots its band")
	t.truthy(not receiver._feedback_copy("WEAK_GAIN_MISMATCH").contains("底噪"), "overshooting gain feedback must not falsely diagnose only low amplitude")
	var before_phase: float = weak.phase_marker_x()
	receiver.set_weak_phase(11)
	t.truthy(not is_equal_approx(weak.phase_marker_x(), before_phase), "phase wheel must move the scope marker")
	t.truthy(is_equal_approx(weak.phase_marker_x(), weak.reference_marker_x()), "measured early echo aligns with the fixed reference notch")
	receiver.free()

func _ready_state():
	var state = preload("res://scripts/core/GameState.gd").new()
	state.world_state = "POWER_RESTORED"
	state.scene_phase = "POWER_RESTORED"
	state.current_view = "SIGNAL_VERIFY"
	state.device_state = {"b_isolated": true, "fuse_installed": true, "coupler_angle": 90.0, "protector_on": true}
	state.installed_item_ids.append("ITM-G01-002")
	state.math_state["probe_prepared"] = true
	state.math_state["observed_cycles"] = 3
	state.math_state["origin_tick"] = 0
	state.math_state["echo_measurement"] = {"pulse": 6, "echo": 5, "confirmed": true}
	state.math_state["blockade_marks"] = [0, 3, 7, 8]
	state.math_state["measurement_stage"] = "windows"
	state.math_state["sample_windows"] = [1, 5, 9]
	state.math_state["window_locked"] = true
	return state

func _new_puzzle():
	return PUZZLE_SCRIPT.new(_ready_state(), CONFIG)

func _tune_maintenance(puzzle) -> void:
	for _step in 3:
		puzzle.adjust_gain("maintenance", 1)

func _tune_weak(puzzle) -> void:
	for _step in 2:
		puzzle.adjust_gain("weak", 1)
	puzzle.set_weak_phase(11)

func _lock_both(puzzle) -> void:
	_tune_maintenance(puzzle)
	puzzle.lock_channel("maintenance")
	_tune_weak(puzzle)
	puzzle.lock_channel("weak")

func _test_requires_restored_diagnostic(t) -> void:
	var state = _ready_state()
	state.world_state = "BLACKOUT"
	var puzzle = PUZZLE_SCRIPT.new(state, CONFIG)
	var result = puzzle.adjust_gain("maintenance", 1)
	t.truthy(not result.ok, "the receiver cannot tune before physical restoration")
	t.equal(result.feedback, "SIGNAL_RECEIVER_NOT_READY")
	t.equal(state.math_state["signal_verification"]["maintenance_gain"], 0, "a blocked receiver cannot mutate its gain")

func _test_maintenance_must_lock_first(t) -> void:
	var puzzle = _new_puzzle()
	puzzle.adjust_gain("weak", 1)
	puzzle.adjust_gain("weak", 1)
	puzzle.set_weak_phase(11)
	var early_weak = puzzle.lock_channel("weak")
	t.truthy(not early_weak.ok, "the weak carrier cannot reveal before automatic maintenance")
	t.equal(early_weak.feedback, "MAINTENANCE_CHANNEL_REQUIRED")
	t.equal(puzzle.state.math_state["signal_verification"]["weak_gain"], 2, "ordering rejection preserves the weak gain wheel")
	t.equal(puzzle.state.math_state["signal_verification"]["weak_phase"], 11, "ordering rejection preserves the weak phase wheel")
	puzzle.adjust_gain("maintenance", 1)
	puzzle.adjust_gain("maintenance", 1)
	var mismatch = puzzle.lock_channel("maintenance")
	t.truthy(not mismatch.ok, "maintenance cannot lock outside gain three")
	t.equal(mismatch.feedback, "MAINTENANCE_GAIN_MISMATCH")
	t.equal(puzzle.state.math_state["signal_verification"]["maintenance_gain"], 2, "a rejected lock never resets the maintenance wheel")
	puzzle.adjust_gain("maintenance", 1)
	var locked = puzzle.lock_channel("maintenance")
	t.truthy(locked.ok)
	t.equal(locked.revealed_channel, "maintenance", "the first successful lock reveals only maintenance")
	t.equal(puzzle.lock_channel("maintenance").revealed_channel, "", "an idempotent repeat cannot reveal the same record twice")

func _test_weak_errors_preserve_controls(t) -> void:
	var puzzle = _new_puzzle()
	_tune_maintenance(puzzle)
	puzzle.lock_channel("maintenance")
	puzzle.adjust_gain("weak", 1)
	puzzle.set_weak_phase(10)
	var wrong_gain = puzzle.lock_channel("weak")
	t.equal(wrong_gain.feedback, "WEAK_GAIN_MISMATCH")
	t.equal(puzzle.state.math_state["signal_verification"]["weak_gain"], 1)
	t.equal(puzzle.state.math_state["signal_verification"]["weak_phase"], 10, "wrong weak gain preserves both knobs")
	puzzle.adjust_gain("weak", 1)
	var wrong_phase = puzzle.lock_channel("weak")
	t.equal(wrong_phase.feedback, "WEAK_PHASE_MISMATCH")
	t.equal(puzzle.state.math_state["signal_verification"]["weak_gain"], 2)
	t.equal(puzzle.state.math_state["signal_verification"]["weak_phase"], 10, "wrong phase does not spring either knob back")
	puzzle.set_weak_phase(11)
	var locked = puzzle.lock_channel("weak")
	t.truthy(locked.ok)
	t.equal(locked.revealed_channel, "weak", "the second lock reveals only the weak carrier")

func _test_two_independent_retains_seal_once(t) -> void:
	var puzzle = _new_puzzle()
	_lock_both(puzzle)
	t.truthy(puzzle.set_retained("maintenance", true).ok, "the maintenance record has its own keep gate")
	var one_gate = puzzle.seal_record()
	t.truthy(not one_gate.ok, "one kept record cannot seal the receiver")
	t.equal(one_gate.feedback, "BOTH_RECORDS_REQUIRED")
	t.equal(puzzle.state.math_state["signal_verification"]["retained_channels"], ["maintenance"], "failed seal preserves the first keep gate")
	t.truthy(puzzle.set_retained("weak", true).ok, "the weak record has an independent keep gate")
	var sealed = puzzle.seal_record()
	t.truthy(sealed.ok and sealed.completed, "both kept records seal the receiver")
	t.equal(sealed.feedback, "RECORD_SEALED")
	t.truthy(puzzle.state.math_state["signal_verification"]["sealed"])
	var snapshot = puzzle.state.math_state["signal_verification"].duplicate(true)
	var repeated = puzzle.seal_record()
	t.truthy(repeated.ok and repeated.completed, "repeating the sealed lever is idempotent")
	t.equal(repeated.feedback, "RECORD_ALREADY_SEALED")
	t.equal(puzzle.state.math_state["signal_verification"], snapshot, "the second pull causes no second state transition")

func _test_receiver_contract_and_completion_boundary(t) -> void:
	var receiver = RECEIVER_SCENE.instantiate()
	for path in [
		"Housing",
		"MaintenanceCarrier/GainWheel/Decrease",
		"MaintenanceCarrier/GainWheel/Increase",
		"MaintenanceCarrier/LockPaddle",
		"MaintenanceCarrier/Waveform",
		"MaintenanceCarrier/Message",
		"WeakCarrier/GainWheel/Decrease",
		"WeakCarrier/GainWheel/Increase",
		"WeakCarrier/PhaseWheel/Advance",
		"WeakCarrier/LockPaddle",
		"WeakCarrier/Waveform",
		"WeakCarrier/Message",
		"KeepGates/MaintenanceGate",
		"KeepGates/WeakGate",
		"SealLever",
		"FeedbackReadout",
	]:
		t.truthy(receiver.has_node(path), "world receiver is missing physical control: %s" % path)
	t.equal(receiver.mouse_filter, Control.MOUSE_FILTER_STOP, "the open receiver must own the full viewport")
	t.truthy(not receiver.has_node("ReturnButton"), "the receiver housing cannot close before record seal")
	var signals := [
		{"channel":"AUTO-MAINT", "waveform":"AUTO-WAVE", "text":"如果还有生命听见……请重新启动十二星门……", "sender":"ZERO-EARTH MAINTENANCE"},
		{"channel":"WEAK-INTERVENTION", "waveform":"WEAK-WAVE", "text":"文明修复者，请不要来。", "sender":"UNKNOWN"},
	]
	var state = _ready_state()
	receiver.setup(state, CONFIG, signals)
	t.truthy(not receiver.get_node("MaintenanceCarrier/Message").visible and not receiver.get_node("WeakCarrier/Message").visible, "neither record text appears before a physical lock")
	var completions := [0]
	receiver.verification_completed.connect(func(): completions[0] += 1)
	for _step in 3:
		receiver.adjust_gain("maintenance", 1)
	receiver.lock_channel("maintenance")
	t.truthy(receiver.get_node("MaintenanceCarrier/Message").visible, "maintenance lock reveals its record")
	t.truthy(not receiver.get_node("WeakCarrier/Message").visible, "maintenance lock cannot reveal the weak record")
	for _step in 2:
		receiver.adjust_gain("weak", 1)
	receiver.set_weak_phase(11)
	receiver.lock_channel("weak")
	t.truthy(receiver.get_node("WeakCarrier/Message").visible, "weak lock reveals the second record")
	t.truthy(receiver.get_node("WeakCarrier/Message").text.contains("SENDER UNKNOWN"), "the weak sender remains UNKNOWN")
	t.truthy(receiver.get_node("WeakCarrier/Message").text.contains("文明修复者，请不要来。"), "the weak record keeps its exact text")
	receiver.set_retained("maintenance", true)
	receiver.set_retained("weak", true)
	receiver.seal_record()
	receiver.seal_record()
	t.equal(completions[0], 1, "the physical seal invokes the completion boundary exactly once")
	receiver.free()

func _test_partial_receiver_state_round_trips_strictly(t) -> void:
	var state = _ready_state()
	state.math_state["signal_verification"] = {
		"maintenance_gain": 3,
		"maintenance_locked": true,
		"weak_gain": 2,
		"weak_phase": 10,
		"weak_locked": false,
		"retained_channels": ["maintenance"],
		"sealed": false,
	}
	var snapshot: Dictionary = state.snapshot()
	var restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(restored.restore(snapshot), "a partially tuned SIGNAL_VERIFY view must restore")
	t.equal(restored.current_view, "SIGNAL_VERIFY")
	t.equal(restored.math_state["signal_verification"], state.math_state["signal_verification"], "every receiver knob, lock, and keep gate resumes exactly")
	var receiver = RECEIVER_SCENE.instantiate()
	receiver.setup(restored, CONFIG, [
		{"channel":"AUTO-MAINT", "waveform":"AUTO-WAVE", "text":"AUTO", "sender":"ZERO-EARTH MAINTENANCE"},
		{"channel":"WEAK-INTERVENTION", "waveform":"WEAK-WAVE", "text":"文明修复者，请不要来。", "sender":"UNKNOWN"},
	])
	t.equal(receiver.get_node("MaintenanceCarrier/GainReadout").text, "增益 3")
	t.equal(receiver.get_node("WeakCarrier/GainReadout").text, "增益 2")
	t.equal(receiver.get_node("WeakCarrier/PhaseReadout").text, "相位 10 / 12")
	t.truthy(receiver.get_node("MaintenanceCarrier/Message").visible and not receiver.get_node("WeakCarrier/Message").visible, "resume reveals exactly the already locked record")
	t.truthy(receiver.get_node("KeepGates/MaintenanceGate").button_pressed and not receiver.get_node("KeepGates/WeakGate").button_pressed, "resume restores the two independent keep gates exactly")
	receiver.free()
	var wrong_world := snapshot.duplicate(true)
	wrong_world["world_state"] = "BLACKOUT"
	var wrong_world_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not wrong_world_restored.restore(wrong_world), "SIGNAL_VERIFY cannot restore without physical power")
	var sealed_view := snapshot.duplicate(true)
	sealed_view["math_state"]["signal_verification"] = {
		"maintenance_gain": 3,
		"maintenance_locked": true,
		"weak_gain": 2,
		"weak_phase": 11,
		"weak_locked": true,
		"retained_channels": ["maintenance", "weak"],
		"sealed": true,
	}
	var sealed_view_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not sealed_view_restored.restore(sealed_view), "a sealed receiver cannot persist as an active SIGNAL_VERIFY soft lock")
