extends RefCounted

const CONFIG := {
	"task_id": "SCN-G01-00-MATH-01",
	"cycle_size": 12,
	"maintenance_pulses": [2, 6, 10],
	"weak_echo_offset": -1,
	"blockade_slots": [0, 3, 7, 8],
	"required_observation_cycles": 3,
	"window_count": 3,
	"window_spacing": 4,
}
const PUZZLE_SCRIPT = preload("res://scripts/puzzle/SignalWindowPuzzle.gd")

func run(t) -> void:
	_test_measurement_surfaces(t)
	_test_staged_measurement_sequence(t)
	_test_stage_mismatches_preserve_confirmed_evidence(t)
	_test_blockade_overlay_requires_exact_map(t)
	_test_windows_wait_for_three_measurements(t)
	_test_required_sequence(t)
	_test_invalid_operations_preserve_progress(t)
	_test_lock_validation_order(t)
	_test_repeated_actions_are_idempotent(t)

func _new_puzzle():
	return PUZZLE_SCRIPT.new(preload("res://scripts/core/GameState.gd").new(), CONFIG)

func _test_measurement_surfaces(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	var console = preload("res://scenes/g01/SignalWindowConsole.tscn").instantiate()
	console.setup(state, null, CONFIG)
	var plate = console.get_node("WindowPlate")
	for name in ["OriginWheel", "EchoCaliper", "BlockadeOverlay", "EtchedEvidence", "SignedRelation"]:
		t.truthy(console.get_node(name).z_index > plate.z_index, "%s must render above the opaque backing plate" % name)
	console.puzzle.prepare_probe(true, true)
	console._refresh_visuals()
	t.truthy(console.get_node("OriginWheel").visible, "the datum wheel is visible before the first measurement")
	var datum_readout: Rect2 = console.get_node("OriginWheel/TickReadout").get_global_rect()
	t.truthy(not datum_readout.intersects(console.get_node("LampLegend").get_global_rect()), "datum reading must not overlap the status lamp legend")
	console.puzzle.set_origin_tick(0)
	console.puzzle.confirm_origin()
	console._refresh_visuals()
	t.truthy(console.get_node("EchoCaliper").visible, "the caliper is visible during echo measurement")
	t.truthy(console.get_node("CycleDrum").visible, "the source paper trace is visible before choosing caliper stops")
	for index in 3:
		var pulse = console.get_node("CycleDrum/Tape/Pulse%d" % index)
		var echo = console.get_node("CycleDrum/Tape/Echo%d" % index)
		t.truthy(pulse.visible and echo.visible, "maintenance and leading echo marks are both shown")
		t.equal(pulse.position.x, -110.0 + 20.0 * CONFIG.maintenance_pulses[index], "paper pulse position uses the configured measurement")
		t.equal(echo.position.x, pulse.position.x - 20.0, "paper echo visibly leads its pulse by one stop")
	console.puzzle.set_echo_caliper(6, 5)
	t.truthy(console.puzzle.confirm_echo_measurement().ok, "console defaults keep the central pulse measurable")
	console._refresh_visuals()
	for tick in 12:
		var mark = console.get_node("CycleDrum/Tape/PhaseScale/Tick%02d" % tick)
		var number = console.get_node("CycleDrum/Tape/PhaseScale/Number%02d" % tick)
		t.truthy(absf(number.get_rect().get_center().x - mark.position.x) < 1.0, "each scale number must align with its own tick, not stack at the center")
		t.equal(mark.default_color.r > 0.7, tick in CONFIG.blockade_slots, "source paper shows occupied ticks before the overlay is guessed")
	console.free()

func _prepare_and_measure(puzzle) -> void:
	puzzle.prepare_probe(true, true)
	puzzle.set_origin_tick(0)
	puzzle.confirm_origin()
	puzzle.set_echo_caliper(6, 5)
	puzzle.confirm_echo_measurement()
	for tick in [0, 3, 7, 8]:
		puzzle.toggle_blockade_mark(tick)
	puzzle.confirm_blockade_overlay()

func _set_correct_windows(puzzle) -> void:
	puzzle.set_window(0, 1)
	puzzle.set_window(1, 5)
	puzzle.set_window(2, 9)

func _has_attempt(state, code: String) -> bool:
	return code in state.math_state["attempt_codes"]

func _test_staged_measurement_sequence(t) -> void:
	var puzzle = _new_puzzle()
	var state = puzzle.state
	puzzle.prepare_probe(true, true)
	t.truthy(puzzle.set_origin_tick(0).ok, "the datum wheel accepts the authored zero stop")
	t.truthy(puzzle.confirm_origin().ok, "the lock pin confirms the physical origin")
	t.equal(state.math_state["measurement_stage"], "echo", "origin confirmation advances only to caliper measurement")
	t.equal(state.math_state["observed_cycles"], 1, "origin confirmation records exactly one distinct cycle")
	t.truthy(puzzle.set_echo_caliper(6, 5).ok, "caliper jaws accept the maintenance pulse and leading weak echo")
	t.truthy(puzzle.confirm_echo_measurement().ok, "measure lever confirms the signed negative-one offset")
	t.equal(state.math_state["measurement_stage"], "blockade", "echo confirmation advances only to the overlay")
	t.equal(state.math_state["observed_cycles"], 2, "echo confirmation records exactly one additional cycle")
	for tick in [0, 3, 7, 8]:
		t.truthy(puzzle.toggle_blockade_mark(tick).ok, "each authored occupied stop can be marked on the overlay")
	t.truthy(puzzle.confirm_blockade_overlay().ok, "the clamp confirms the exact occupied-stop overlay")
	t.equal(state.math_state["measurement_stage"], "windows", "three unlike measurements unlock the sampling windows")
	t.equal(state.math_state["observed_cycles"], 3, "three successful confirmations record exactly three cycles")
	var saved = state.snapshot()
	var restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(restored.restore(saved), "the confirmed origin, echo, and blockade evidence must resume")
	t.equal(restored.math_state, state.math_state, "measurement resume preserves the exact staged evidence")

func _test_stage_mismatches_preserve_confirmed_evidence(t) -> void:
	var puzzle = _new_puzzle()
	var state = puzzle.state
	state.scene_phase = "REPAIR"
	state.current_view = "POWER_PANEL"
	state.investigation_state["burn_scan_points"] = [0, 2]
	puzzle.prepare_probe(true, true)
	puzzle.set_origin_tick(1)
	var wrong_origin = puzzle.confirm_origin()
	t.equal(wrong_origin.feedback, "ORIGIN_MISMATCH", "a non-zero datum cannot establish phase origin")
	t.equal(state.math_state["measurement_stage"], "origin")
	t.equal(state.math_state["observed_cycles"], 0)
	puzzle.set_origin_tick(0)
	puzzle.confirm_origin()
	var origin_snapshot = state.math_state.duplicate(true)
	t.equal(puzzle.confirm_origin().feedback, "ORIGIN_CONFIRMED", "repeating a confirmed origin is idempotent")
	t.equal(state.math_state, origin_snapshot, "repeat confirmation cannot count or mutate the origin twice")
	puzzle.set_echo_caliper(6, 6)
	t.equal(puzzle.confirm_echo_measurement().feedback, "ECHO_OFFSET_MISMATCH", "zero-span jaws reject the missing lead")
	puzzle.set_echo_caliper(6, 7)
	t.equal(puzzle.confirm_echo_measurement().feedback, "ECHO_OFFSET_MISMATCH", "a trailing jaw rejects the wrong direction")
	t.equal(state.math_state["origin_tick"], 0, "echo failures preserve the locked origin")
	t.equal(state.math_state["observed_cycles"], 1, "echo failures do not recount the first cycle")
	t.equal(state.scene_phase, "REPAIR", "measurement failure preserves unrelated scene phase")
	t.equal(state.current_view, "POWER_PANEL", "measurement failure preserves close-up ownership")
	t.equal(state.investigation_state["burn_scan_points"], [0, 2], "measurement failure preserves forensic progress")
	puzzle.set_echo_caliper(6, 5)
	puzzle.confirm_echo_measurement()
	var confirmed_echo = state.math_state["echo_measurement"].duplicate(true)
	t.truthy(not puzzle.set_origin_tick(1).ok, "an earlier locked wheel cannot be changed from a later stage")
	t.equal(state.math_state["origin_tick"], 0)
	t.equal(state.math_state["echo_measurement"], confirmed_echo)
	t.equal(state.math_state["observed_cycles"], 2)

func _test_blockade_overlay_requires_exact_map(t) -> void:
	var missing = _new_puzzle()
	missing.prepare_probe(true, true)
	missing.set_origin_tick(0)
	missing.confirm_origin()
	missing.set_echo_caliper(6, 5)
	missing.confirm_echo_measurement()
	for tick in [0, 3, 7]:
		missing.toggle_blockade_mark(tick)
	t.equal(missing.confirm_blockade_overlay().feedback, "BLOCKADE_MAP_INCOMPLETE", "a missing occupied stop leaves the overlay unclamped")
	t.equal(missing.state.math_state["measurement_stage"], "blockade")
	t.equal(missing.state.math_state["observed_cycles"], 2)
	t.equal(missing.state.math_state["origin_tick"], 0)
	t.truthy(missing.state.math_state["echo_measurement"]["confirmed"], "overlay failure preserves confirmed caliper evidence")

	var extra = _new_puzzle()
	extra.prepare_probe(true, true)
	extra.set_origin_tick(0)
	extra.confirm_origin()
	extra.set_echo_caliper(6, 5)
	extra.confirm_echo_measurement()
	for tick in [0, 3, 7, 8, 9]:
		var result = extra.toggle_blockade_mark(tick)
		if tick == 9:
			t.equal(result.feedback, "BLOCKADE_MAP_INCOMPLETE", "a fifth overlay mark is rejected without clearing the four physical marks")
	t.equal(extra.state.math_state["blockade_marks"], [0, 3, 7, 8])
	t.equal(extra.confirm_blockade_overlay().feedback, "BLOCKADE_OVERLAY_CONFIRMED", "the preserved exact four marks can still clamp")
	t.equal(extra.state.math_state["measurement_stage"], "windows")

func _test_windows_wait_for_three_measurements(t) -> void:
	var puzzle = _new_puzzle()
	puzzle.prepare_probe(true, true)
	t.equal(puzzle.set_window(0, 1).feedback, "MEASUREMENT_INCOMPLETE", "sampling rings remain gated during origin measurement")
	puzzle.set_origin_tick(0)
	puzzle.confirm_origin()
	t.equal(puzzle.set_window(0, 1).feedback, "MEASUREMENT_INCOMPLETE", "sampling rings remain gated during caliper measurement")
	puzzle.set_echo_caliper(6, 5)
	puzzle.confirm_echo_measurement()
	t.equal(puzzle.set_window(0, 1).feedback, "MEASUREMENT_INCOMPLETE", "sampling rings remain gated until the overlay clamps")
	for tick in [0, 3, 7, 8]:
		puzzle.toggle_blockade_mark(tick)
	puzzle.confirm_blockade_overlay()
	t.truthy(puzzle.set_window(0, 1).ok, "sampling rings unlock only at the windows stage")

func _test_required_sequence(t) -> void:
	var puzzle = _new_puzzle()
	var state = puzzle.state
	t.equal(puzzle.expected_windows(), [1, 5, 9], "windows must derive from pulses plus the weak-echo offset")
	t.truthy(not puzzle.prepare_probe(true, false).ok, "gloves are mandatory")
	t.truthy(_has_attempt(state, "PROBE_UNSAFE"), "unsafe preparation is recorded")
	t.truthy(puzzle.prepare_probe(true, true).ok, "both physical tools prepare the probe")
	t.truthy(not puzzle.lock_windows(true).ok, "three observed cycles are mandatory")
	t.truthy(_has_attempt(state, "OBSERVATION_INCOMPLETE"), "incomplete observation is recorded")
	puzzle.set_origin_tick(0)
	puzzle.confirm_origin()
	puzzle.set_echo_caliper(6, 5)
	puzzle.confirm_echo_measurement()
	var echo_snapshot = state.math_state.duplicate(true)
	t.truthy(puzzle.confirm_echo_measurement().ok, "repeat caliper confirmation is safe")
	t.equal(state.math_state, echo_snapshot, "repeat caliper confirmation cannot recount or mutate evidence")
	for tick in [0, 3, 7, 8]:
		puzzle.toggle_blockade_mark(tick)
	puzzle.confirm_blockade_overlay()
	_set_correct_windows(puzzle)
	t.truthy(not puzzle.lock_windows(false).ok, "B isolation remains mandatory")
	t.truthy(_has_attempt(state, "B_NOT_ISOLATED"), "missing isolation is recorded")
	t.truthy(puzzle.lock_windows(true).ok, "derived windows lock after safe isolation")
	t.truthy(not state.math_state["completed"] and not state.math_state["signal_split"], "locking windows only prepares the later physical receiver")

func _test_invalid_operations_preserve_progress(t) -> void:
	var puzzle = _new_puzzle()
	var state = puzzle.state
	state.scene_phase = "REPAIR"
	state.current_view = "POWER_PANEL"
	state.investigation_state["burn_scan_points"] = [0, 2]
	_prepare_and_measure(puzzle)
	_set_correct_windows(puzzle)
	var windows_before: Array = state.math_state["sample_windows"].duplicate()
	t.truthy(not puzzle.set_window(-1, 1).ok, "negative window index is rejected safely")
	t.truthy(not puzzle.set_window(3, 1).ok, "past-end window index is rejected safely")
	t.truthy(not puzzle.set_window(0, -1).ok, "negative tick is rejected safely")
	t.truthy(not puzzle.set_window(0, 12).ok, "past-cycle tick is rejected safely")
	t.equal(state.math_state["sample_windows"], windows_before, "invalid window input preserves correct positions")
	t.equal(state.scene_phase, "REPAIR", "invalid window input preserves unrelated scene phase")
	t.equal(state.current_view, "POWER_PANEL", "invalid window input preserves unrelated view progress")
	t.equal(state.investigation_state["burn_scan_points"], [0, 2], "invalid window input preserves inspection progress")

func _test_lock_validation_order(t) -> void:
	var duplicate = _new_puzzle()
	_prepare_and_measure(duplicate)
	duplicate.set_window(0, 1)
	duplicate.set_window(1, 1)
	duplicate.set_window(2, 9)
	t.equal(duplicate.lock_windows(true).feedback, "WINDOW_NOT_EQUAL", "positions must be unique before other window checks")

	var unequal = _new_puzzle()
	_prepare_and_measure(unequal)
	unequal.set_window(0, 1)
	unequal.set_window(1, 5)
	unequal.set_window(2, 10)
	t.equal(unequal.lock_windows(true).feedback, "WINDOW_NOT_EQUAL", "windows must maintain circular spacing of four")

	var blockade = _new_puzzle()
	_prepare_and_measure(blockade)
	blockade.set_window(0, 0)
	blockade.set_window(1, 4)
	blockade.set_window(2, 8)
	t.equal(blockade.lock_windows(true).feedback, "BLOCKADE_COLLISION", "blockade slots reject otherwise evenly spaced windows")

	var wrong_phase = _new_puzzle()
	_prepare_and_measure(wrong_phase)
	wrong_phase.set_window(0, 2)
	wrong_phase.set_window(1, 6)
	wrong_phase.set_window(2, 10)
	t.equal(wrong_phase.lock_windows(true).feedback, "PHASE_MISMATCH", "only the derived pulse phase can lock")

func _test_repeated_actions_are_idempotent(t) -> void:
	var puzzle = _new_puzzle()
	var state = puzzle.state
	t.truthy(puzzle.prepare_probe(true, true).ok)
	t.truthy(puzzle.prepare_probe(true, true).ok, "preparing an already safe probe is deterministic")
	puzzle.set_origin_tick(0)
	puzzle.confirm_origin()
	puzzle.set_echo_caliper(6, 5)
	puzzle.confirm_echo_measurement()
	for tick in [0, 3, 7, 8]:
		puzzle.toggle_blockade_mark(tick)
	puzzle.confirm_blockade_overlay()
	t.truthy(puzzle.confirm_blockade_overlay().ok, "repeat overlay confirmation is safe")
	t.equal(state.math_state["observed_cycles"], 3, "observations cap at the configured requirement")
	_set_correct_windows(puzzle)
	t.truthy(puzzle.lock_windows(true).ok)
	t.truthy(puzzle.lock_windows(true).ok, "locking an already locked solution is deterministic")
	var locked_windows: Array = state.math_state["sample_windows"].duplicate()
	t.truthy(not puzzle.set_window(0, 2).ok, "locked positions cannot be changed")
	t.equal(state.math_state["sample_windows"], locked_windows, "rejected repeat mutation preserves locked positions")
	t.truthy(not state.math_state["completed"] and not state.math_state["signal_split"], "repeated diagnostic locks cannot complete the later dual-signal ending")
