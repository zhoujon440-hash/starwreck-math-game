extends RefCounted

const MECHANICS_PATH := "res://scripts/interaction/EvidenceInspectionMechanics.gd"
const FORENSIC_CONFIG := {
	"burn_baseline_target": [1, 2, 2, 3],
	"burn_hold_seconds": 0.65,
	"tape_order_target": [1, 0, 2],
	"tape_positions_target": [2, 1, 2],
	"plate_trace_target": [0, 2, 3, 5],
}

func run(t) -> void:
	_test_observable_forensic_surfaces(t)
	t.truthy(ResourceLoader.exists(MECHANICS_PATH), "multi-step evidence inspection mechanics must exist")
	if not ResourceLoader.exists(MECHANICS_PATH):
		return
	var script = load(MECHANICS_PATH)
	var state = preload("res://scripts/core/GameState.gd").new()
	var mechanics = script.new(state, FORENSIC_CONFIG)
	var inspection = preload("res://scripts/interaction/EvidenceInspection.gd").new()
	var rejected_explanations: Array[String] = []
	for clue_id in ["CLUE-002", "CLUE-003", "CLUE-004"]:
		for hypothesis_index in 3:
			if hypothesis_index == int({"CLUE-002": 1, "CLUE-003": 2, "CLUE-004": 0}[clue_id]):
				continue
			var explanation: String = inspection._hypothesis_feedback(clue_id, hypothesis_index)
			t.truthy(explanation.length() >= 55, "%s wrong hypothesis %d needs a specific, readable counter-comparison" % [clue_id, hypothesis_index])
			rejected_explanations.append(explanation)
	t.equal(rejected_explanations.size(), 6, "all six plausible wrong interpretations need world-specific feedback")
	var unique_explanations: Array[String] = []
	for explanation in rejected_explanations:
		if explanation not in unique_explanations:
			unique_explanations.append(explanation)
	t.equal(unique_explanations.size(), 6, "wrong hypotheses must not reuse generic filler feedback")
	inspection.free()
	for clue_id in ["CLUE-002", "CLUE-003", "CLUE-004"]:
		for detail_index in 3:
			var detail = mechanics.observe_evidence_detail(clue_id, detail_index)
			_assert_result_shape(t, detail, "%s observation" % clue_id)
			t.truthy(detail.ok, "%s observation detail %d must be inspectable" % [clue_id, detail_index])
		t.truthy(mechanics.evidence_details_complete(clue_id), "%s requires all three observation comparisons before manipulation" % clue_id)
	var hypothesis_targets := {"CLUE-002": 1, "CLUE-003": 2, "CLUE-004": 0}
	for clue_id in hypothesis_targets:
		var wrong_hypothesis = mechanics.choose_evidence_hypothesis(clue_id, (int(hypothesis_targets[clue_id]) + 1) % 3)
		_assert_result_shape(t, wrong_hypothesis, "%s rejected hypothesis" % clue_id)
		t.truthy(not wrong_hypothesis.ok, "%s rejects a plausible but unsupported interpretation" % clue_id)
		var accepted_hypothesis = mechanics.choose_evidence_hypothesis(clue_id, int(hypothesis_targets[clue_id]))
		t.truthy(accepted_hypothesis.completed and mechanics.evidence_hypothesis_confirmed(clue_id), "%s accepted interpretation unlocks its physical mechanism" % clue_id)

	# Burn mutation caught: scanning must not advance when baseline locking or hold duration is bypassed.
	var blocked_scan = mechanics.advance_burn_hold(0, 0.65)
	_assert_result_shape(t, blocked_scan, "blocked burn hold")
	t.truthy(not blocked_scan.ok and blocked_scan.feedback == "BASELINE_UNSTABLE", "burn scanning stays blocked before a calibrated baseline lock")
	t.truthy(not mechanics.lock_burn_baseline().ok, "neutral calibration cannot be locked")
	for segment in 4:
		for _step in int(FORENSIC_CONFIG["burn_baseline_target"][segment]):
			t.truthy(mechanics.calibrate_burn_segment(segment, 1).ok, "each baseline segment turns independently")
	t.equal(state.investigation_state["burn_baseline"], [1, 2, 2, 3], "burn baseline reaches the hand-authored four-segment reference")
	var baseline_lock = mechanics.lock_burn_baseline()
	t.truthy(baseline_lock.ok and baseline_lock.completed and baseline_lock.changed, "matching baseline locks exactly once")
	var duplicate_lock = mechanics.lock_burn_baseline()
	t.truthy(duplicate_lock.ok and not duplicate_lock.changed, "relocking a calibrated baseline is idempotent")
	t.truthy(mechanics.has_method("toggle_burn_scan_point"), "burn scan must expose a click-confirm path for real OS input")
	var armed_scan: Dictionary = mechanics.call("toggle_burn_scan_point", 0) if mechanics.has_method("toggle_burn_scan_point") else {}
	if mechanics.has_method("toggle_burn_scan_point"):
		_assert_result_shape(t, armed_scan, "armed burn scan")
		t.truthy(armed_scan.ok and armed_scan.changed and not armed_scan.completed, "first physical click only arms the next authored scan point")
		t.equal(state.investigation_state["burn_scan_points"], [], "arming a scan point must not auto-complete it")
		t.equal(state.investigation_state["burn_active_point"], 0, "arming stores the exact pending scan point in resumable state")
	var rejected_direction = mechanics.call("toggle_burn_scan_point", 2) if mechanics.has_method("toggle_burn_scan_point") else {}
	if mechanics.has_method("toggle_burn_scan_point"):
		t.truthy(not rejected_direction.ok and rejected_direction.feedback == "SCAN_DIRECTION_REJECTED", "only the next outside-to-inside scan point can be armed or confirmed")
		t.equal(state.investigation_state["burn_active_point"], 0, "wrong-direction click keeps the armed burn point intact")
	var burn_snapshot = state.snapshot()
	var burn_resumed = preload("res://scripts/core/GameState.gd").new()
	t.truthy(burn_resumed.restore(burn_snapshot), "armed burn scan is a valid resumable save")
	var resumed_burn = script.new(burn_resumed, FORENSIC_CONFIG)
	if resumed_burn.has_method("toggle_burn_scan_point"):
		var confirmed_scan: Dictionary = resumed_burn.call("toggle_burn_scan_point", 0)
		_assert_result_shape(t, confirmed_scan, "confirmed burn scan")
		t.truthy(confirmed_scan.ok and confirmed_scan.changed and not confirmed_scan.completed, "second click on the armed head confirms exactly one burn direction")
		t.equal(burn_resumed.investigation_state["burn_active_point"], -1, "confirmed scan clears the armed head")
		var partial_hold = resumed_burn.advance_burn_hold(1, 0.30)
		t.truthy(partial_hold.ok and partial_hold.changed and not partial_hold.completed, "hold input remains available after the click-confirm fallback arms the route")
		var partial_progress := float(burn_resumed.investigation_state["burn_hold_progress"])
		t.truthy(partial_progress > 0.4 and partial_progress < 0.5, "partial burn hold stays normalized against the authored duration")
		var point_one_scan: Dictionary = resumed_burn.call("toggle_burn_scan_point", 1)
		t.truthy(point_one_scan.ok and point_one_scan.changed and not point_one_scan.completed, "a confirmed point can finish from either partial hold progress or an armed click")
		for point in [2, 3]:
			var armed_point: Dictionary = resumed_burn.call("toggle_burn_scan_point", point)
			t.truthy(armed_point.ok and armed_point.changed and not armed_point.completed, "later burn points arm in authored order")
			var scan = resumed_burn.call("toggle_burn_scan_point", point)
			t.equal(scan.completed, point == 3, "only the fourth confirmed direction point completes burn forensics")
	t.equal(burn_resumed.investigation_state["burn_scan_points"], [0, 1, 2, 3], "burn direction confirmation remains ordered")

	# Tape mutation caught: correct faces alone cannot bypass order, and a reel's
	# visible face travels with that physical reel.
	for _step in 2:
		mechanics.cycle_tape_reel(0)
	mechanics.cycle_tape_reel(1)
	for _step in 2:
		mechanics.cycle_tape_reel(2)
	var faces_only = mechanics.verify_tape_run()
	_assert_result_shape(t, faces_only, "faces-only tape run")
	t.truthy(not faces_only.ok and faces_only.feedback == "TAPE_ORDER_MISMATCH", "correct faces with wrong reel order stop at the seam")
	mechanics.cycle_tape_reel(0)
	for _step in 2:
		mechanics.cycle_tape_reel(1)
	mechanics.cycle_tape_reel(2)
	mechanics.cycle_tape_reel(0)
	t.equal(state.investigation_state["tape_positions"], [1, 0, 0], "the first physical reel keeps its rotated face before moving")
	var tape_swap = mechanics.swap_tape_reels(0)
	t.truthy(tape_swap.ok and tape_swap.changed, "left adjacent swap exchanges physical reels 0 and 1")
	t.equal(state.investigation_state["tape_order"], [1, 0, 2], "left adjacent swap produces the authored time order")
	t.equal(state.investigation_state["tape_positions"], [0, 1, 0], "adjacent swap carries each face orientation with its physical reel identity")
	var invalid_swap = mechanics.swap_tape_reels(2)
	t.truthy(not invalid_swap.ok and not invalid_swap.changed, "only adjacent swap positions 0 and 1 exist")
	for _step in 2:
		mechanics.cycle_tape_reel(0)
	for _step in 2:
		mechanics.cycle_tape_reel(2)
	var tape_run = mechanics.verify_tape_run()
	t.truthy(tape_run.ok and tape_run.completed and tape_run.changed, "run lever verifies matching order and face positions")
	var duplicate_run = mechanics.verify_tape_run()
	t.truthy(duplicate_run.ok and not duplicate_run.changed, "verified tape run is idempotent")

	# Plate mutation caught: a dead branch must never erase the already traced approved path.
	var early_right = mechanics.toggle_plate_latch(1)
	t.truthy(not early_right.ok, "right Rev.3 latch cannot release before left pressure latch")
	t.truthy(mechanics.toggle_plate_latch(0).ok, "left Rev.3 pressure latch releases")
	t.truthy(mechanics.toggle_plate_latch(1).ok, "right Rev.3 latch releases after pressure relief")
	var pre_lift_trace = mechanics.trace_plate_node(0)
	t.truthy(not pre_lift_trace.ok and pre_lift_trace.feedback == "cover_still_latched" and not pre_lift_trace.changed, "released latches alone cannot bypass the physical cover lift")
	t.equal(state.investigation_state["plate_trace_nodes"], [], "pre-lift probing cannot persist a trace node")
	var lift = mechanics.lift_revision_cover()
	t.truthy(lift.ok and lift.completed and lift.changed, "two released latches persist the one-time physical cover lift")
	t.truthy(state.investigation_state["plate_cover_lifted"], "the exposed trace plate is part of resumable investigation state")
	var duplicate_lift = mechanics.lift_revision_cover()
	t.truthy(duplicate_lift.ok and duplicate_lift.completed and not duplicate_lift.changed, "lifting an already exposed cover is idempotent")
	t.truthy(mechanics.trace_plate_node(0).ok and mechanics.trace_plate_node(2).ok, "probe follows the first two approved-path nodes")
	var seam_break = mechanics.trace_plate_node(1)
	t.truthy(not seam_break.ok and seam_break.feedback == "TRACE_BREAKS_AT_SEAM", "old B-to-C groove visibly breaks at its seam")
	var dead_end = mechanics.trace_plate_node(4)
	_assert_result_shape(t, dead_end, "plate dead end")
	t.truthy(not dead_end.ok and dead_end.feedback == "trace_dead_end", "a different wrong branch reports a recoverable trace dead end")
	t.equal(state.investigation_state["plate_trace_nodes"], [0, 2], "wrong trace branches preserve confirmed nodes")
	var plate_snapshot = state.snapshot()
	var plate_resumed = preload("res://scripts/core/GameState.gd").new()
	t.truthy(plate_resumed.restore(plate_snapshot), "partial plate trace is a valid resumable save")
	var resumed_plate = script.new(plate_resumed, FORENSIC_CONFIG)
	t.truthy(resumed_plate.trace_plate_node(3).ok, "resumed probe continues from the next approved node")
	var plate_finish = resumed_plate.trace_plate_node(5)
	t.truthy(plate_finish.ok and plate_finish.completed, "approved Rev.3 path finishes at the spare slot")
	t.truthy(state.observed_clue_ids.is_empty() and plate_resumed.observed_clue_ids.is_empty(), "physical forensic completion never awards a clue before RecordEvidence")

	# Wrong operations in one mechanism must not damage another mechanism or consume tools.
	state.inventory_item_ids.assign(["ITM-G01-001", "ITM-G01-003", "ITM-G01-004"])
	var preserved_tape_order: Array = state.investigation_state["tape_order"].duplicate()
	var preserved_trace: Array = state.investigation_state["plate_trace_nodes"].duplicate()
	mechanics.advance_burn_hold(3, 0.1)
	t.equal(state.investigation_state["tape_order"], preserved_tape_order, "burn rejection leaves tape reconstruction untouched")
	t.equal(state.investigation_state["plate_trace_nodes"], preserved_trace, "burn rejection leaves plate tracing untouched")
	t.equal(state.inventory_item_ids, ["ITM-G01-001", "ITM-G01-003", "ITM-G01-004"], "forensic rejection consumes no key or support item")

	# Existing cabinet operations remain part of the same mechanics boundary.
	t.truthy(not mechanics.toggle_fuse_latch(0).ok and not mechanics.can_take_fuse(), "fuse clips stay inaccessible while cabinet props obscure the holder")
	var wrench_move = mechanics.move_cabinet_obstruction("wrench")
	t.truthy(wrench_move.ok and wrench_move.changed, "first wrench move changes the cabinet obstruction state")
	var duplicate_wrench_move = mechanics.move_cabinet_obstruction("wrench")
	t.truthy(duplicate_wrench_move.ok and not duplicate_wrench_move.changed, "repeating an already moved wrench is idempotent")
	t.truthy(mechanics.move_cabinet_obstruction("glove").ok, "glove can be moved to expose the later inspection mark")
	t.truthy(mechanics.toggle_fuse_latch(0).ok, "left fuse retaining clip releases")
	t.truthy(not mechanics.can_take_fuse(), "one retaining clip cannot release the fuse")
	t.truthy(mechanics.toggle_fuse_latch(1).ok and mechanics.can_take_fuse(), "both retaining clips release the correctly rated fuse")

func _test_observable_forensic_surfaces(t) -> void:
	# Missing live heat, reel identity binding, or pre-existing grooves makes these
	# puzzles depend on invisible answers even when their rule tests still pass.
	var state = preload("res://scripts/core/GameState.gd").new()
	var view = preload("res://scenes/ui/EvidenceInspection.tscn").instantiate()
	# The scene loads JSON numbers as floats; literal-only fixtures miss identity
	# lookups that silently stop finding the integer IDs in live game state.
	var scene_data = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	view.setup(state, scene_data["forensic_workbench"])
	for clue in ["CLUE-002", "CLUE-003", "CLUE-004"]:
		for detail in 3:
			view.mechanics.observe_evidence_detail(clue, detail)
		view.mechanics.choose_evidence_hypothesis(clue, {"CLUE-002": 1, "CLUE-003": 2, "CLUE-004": 0}[clue])
	view.open_inspection("CLUE-002")
	var reference = view.get_node_or_null("Workbench/BurnPanel/ThermalReference")
	t.truthy(reference != null, "burn baseline needs a visible common thermal reference before adjustment")
	for segment in 4:
		var heat = view.get_node_or_null("Workbench/BurnPanel/Heat%d" % segment)
		t.truthy(heat != null, "each burn segment needs a live heat trace")
		if heat == null or reference == null:
			continue
		var initial: PackedVector2Array = heat.points.duplicate()
		t.truthy(not reference.get_rect().has_point(initial[0]), "uncalibrated heat must visibly miss the reference")
		for _step in int(FORENSIC_CONFIG["burn_baseline_target"][segment]):
			view._on_baseline_adjust(segment)
		t.truthy(heat.points != initial, "turning a baseline dial must move its physical heat trace")
		t.truthy(reference.get_rect().has_point(heat.points[0]), "a calibrated segment must visibly enter the common reference")
	view.open_inspection("CLUE-003")
	var mark = view.get_node_or_null("Workbench/TapePanel/Reel0/TimeMark")
	t.truthy(mark != null, "paper reels need identity-bound physical time stamps")
	if mark != null:
		t.truthy(mark.text.contains("00:02"), "physical reel zero is the middle time interval, not the first")
		view._on_tape_swap(0)
		for slot in 3:
			t.truthy(view.get_node("Workbench/TapePanel/Reel%d/TimeMark" % slot).text.contains("00:0%d" % (slot + 1)), "accepted reel order must display chronological time stamps")
		for slot in 3:
			for _step in int(FORENSIC_CONFIG["tape_positions_target"][slot]):
				view._on_tape_reel(slot)
		for seam in 2:
			_assert_tape_join(t, view, seam, true)
		for slot in 3:
			var before: PackedVector2Array = view.get_node("Workbench/TapePanel/Reel%d/SurgeTrace" % slot).points.duplicate()
			view._on_tape_reel(slot)
			t.truthy(before != view.get_node("Workbench/TapePanel/Reel%d/SurgeTrace" % slot).points, "turning a physical reel changes the visible waveform")
			_assert_tape_join(t, view, mini(slot, 1), false)
			view._on_tape_reel(slot)
			view._on_tape_reel(slot)
		var moved_face: PackedVector2Array = view.get_node("Workbench/TapePanel/Reel0/SurgeTrace").points.duplicate()
		view._on_tape_swap(0)
		t.equal(view.get_node("Workbench/TapePanel/Reel1/SurgeTrace").points, moved_face, "a paper waveform travels with its reel when swapped")
	view.open_inspection("CLUE-004")
	var groove = view.get_node_or_null("Workbench/PlatePanel/ApprovedGroove")
	var old_start = view.get_node_or_null("Workbench/PlatePanel/OldGrooveStart")
	var old_end = view.get_node_or_null("Workbench/PlatePanel/OldGrooveEnd")
	t.truthy(groove != null and old_start != null and old_end != null, "plate must contain authored approved and broken old grooves before any trace")
	if groove != null and old_start != null and old_end != null:
		t.truthy(not groove.visible and not old_start.visible and not old_end.visible, "closed cover hides all path evidence")
		view._on_plate_latch(0)
		view._on_plate_latch(1)
		t.truthy(not groove.visible, "released locks alone cannot expose the grooves")
		view._on_plate_lift()
		t.truthy(groove.visible and old_start.visible and old_end.visible, "lifting the cover reveals both alternatives before the first node")
		t.truthy(not view.get_node("Workbench/PlatePanel/TraceProbe").visible, "the probe must not float at the panel origin before choosing its first socket")
		t.equal(state.investigation_state["plate_trace_nodes"], [], "reading the authored plate does not auto-trace it")
		for index in [0, 2, 3, 5]:
			var node = view.get_node("Workbench/PlatePanel/TraceNode%d" % index)
			t.truthy(groove.points.has(node.position + node.size * 0.5), "approved groove physically connects each accepted socket")
		t.truthy(old_start.points[-1].distance_to(old_end.points[0]) >= 24.0, "old B-to-C path has a visible physical gap")
		var etched_points: PackedVector2Array = groove.points.duplicate()
		view._on_trace_node(0)
		t.truthy(view.get_node("Workbench/PlatePanel/TraceProbe").visible, "choosing the first socket places the visible probe on the plate")
		view._on_trace_node(1)
		t.equal(groove.points, etched_points, "probe progress or rejection cannot redraw the underlying authored evidence")
	view.free()

func _assert_tape_join(t, view, seam: int, aligned: bool) -> void:
	for trace_name in ["UpperPressLine", "LowerPressLine", "SurgeTrace"]:
		var left = view.get_node_or_null("Workbench/TapePanel/Reel%d/%s" % [seam, trace_name])
		var right = view.get_node_or_null("Workbench/TapePanel/Reel%d/%s" % [seam + 1, trace_name])
		t.truthy(left != null and right != null, "paper faces need drawn pressure lines and surge segments")
		if left != null and right != null:
			t.equal(is_equal_approx(left.points[-1].y, right.points[0].y), aligned, "physical traces must match across a seam exactly when the faces join")

func _assert_result_shape(t, result: Dictionary, context: String) -> void:
	var keys: Array = result.keys()
	keys.sort()
	t.equal(keys, ["changed", "completed", "feedback", "ok"], "%s returns the four-field mechanics contract" % context)
	t.truthy(result["ok"] is bool and result["completed"] is bool and result["feedback"] is String and result["changed"] is bool, "%s result fields keep strict types" % context)
