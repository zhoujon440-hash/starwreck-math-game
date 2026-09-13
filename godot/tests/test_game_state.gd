extends RefCounted

func run(t) -> void:
	_test_restored_world_phase_consistency(t)
	var state = preload("res://scripts/core/GameState.gd").new()
	t.equal(state.investigation_state["burn_baseline"], [0, 0, 0, 0], "burn calibration starts at four neutral segments")
	t.equal(state.investigation_state["burn_active_point"], -1, "no burn point is active by default")
	t.equal(state.investigation_state["tape_order"], [0, 1, 2], "tape reels start in their physical order")
	t.equal(state.investigation_state["plate_cover_lifted"], false, "Rev.3 cover starts latched over the trace plate")
	t.equal(state.investigation_state["repair_synthesis_steps"], [], "repair synthesis starts without placed plates")
	t.equal(state.math_state["measurement_stage"], "origin", "signal measurement starts at origin")
	t.equal(state.math_state["echo_measurement"], {"pulse": 0, "echo": 0, "confirmed": false}, "echo caliper starts unconfirmed")
	t.equal(state.math_state["blockade_marks"], [], "blockade overlay starts empty")
	t.equal(state.math_state["signal_verification"]["retained_channels"], [], "no ending signal is retained by default")
	state.scene_phase = "SLICE_COMPLETE"
	state.world_state = "POWER_RESTORED"
	state.observed_clue_ids.assign(["CLUE-001", "CLUE-002"])
	state.analyzed_clue_ids.assign(["CLUE-001"])
	state.device_state = {"b_isolated": true, "fuse_installed": true, "coupler_angle": 90.0, "protector_on": true}
	state.installed_item_ids.append("ITM-G01-002")
	state.set("hint_stage", 2)
	state.set("last_progress_elapsed_seconds", 47.5)
	state.set("current_view", "COCKPIT")
	var math_state = {
		"support_tier": "standard",
		"task_id": "SCN-G01-00-MATH-01",
		"probe_prepared": true,
		"observed_cycles": 3,
		"sample_windows": [1, 5, 9],
		"window_locked": true,
		"completed": true,
		"signal_split": true,
		"attempt_codes": ["BLOCKADE_COLLISION"],
		"hint_stage": 1,
		"measurement_stage": "complete",
		"origin_tick": 0,
		"echo_measurement": {"pulse": 6, "echo": 5, "confirmed": true},
		"blockade_marks": [0, 3, 7, 8],
		"signal_verification": {
			"maintenance_gain": 3,
			"maintenance_locked": true,
			"weak_gain": 2,
			"weak_phase": 11,
			"weak_locked": true,
			"retained_channels": ["maintenance", "weak"],
			"sealed": true,
		},
	}
	state.math_state = math_state
	var data = state.snapshot()
	t.truthy(data.has("math_state"), "math progress state must be persisted")
	var math_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(math_restored.restore(data), "valid math progress state must restore")
	t.equal(math_restored.snapshot().get("math_state"), math_state, "math progress state must round-trip")
	t.truthy(data.has("investigation_state"), "multi-step evidence inspection progress must be persisted")
	t.equal(data.get("hint_stage"), 2, "anti-stuck hint stage must be persisted")
	t.equal(data.get("last_progress_elapsed_seconds"), 47.5, "progress timer must be persisted")
	t.equal(data.get("current_view"), "COCKPIT", "terminal cockpit view must be persisted")
	t.equal(data.get("analyzed_clue_ids"), ["CLUE-001"], "intentional clue analysis must survive reload")
	var restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(restored.restore(data), "valid snapshot must restore")
	t.equal(restored.scene_phase, "SLICE_COMPLETE")
	t.equal(restored.observed_clue_ids, ["CLUE-001", "CLUE-002"])
	t.equal(restored.device_state["b_isolated"], true)
	t.equal(restored.snapshot().get("hint_stage"), 2)
	t.equal(restored.snapshot().get("last_progress_elapsed_seconds"), 47.5)
	t.equal(restored.snapshot().get("current_view"), "COCKPIT")
	t.equal(restored.snapshot().get("analyzed_clue_ids"), ["CLUE-001"])
	if data.has("investigation_state"):
		var inspection: Dictionary = data.get("investigation_state").duplicate(true)
		inspection["burn_scan_points"] = [0, 1, 2]
		inspection["tape_positions"] = [2, 1, 2]
		inspection["plate_latches"] = [true, true]
		inspection["plate_cover_lifted"] = true
		inspection["cabinet_obstructions"] = {"wrench": true, "glove": false}
		inspection["fuse_latches"] = [true, false]
		inspection["burn_baseline"] = [1, 2, 2, 3]
		inspection["burn_baseline_locked"] = true
		inspection["burn_active_point"] = 3
		inspection["burn_hold_progress"] = 0.5
		inspection["tape_order"] = [1, 0, 2]
		inspection["tape_verified"] = true
		inspection["plate_trace_nodes"] = [0, 2, 3, 5]
		inspection["repair_synthesis_steps"] = [{"slot": 0, "plate_id": "REV3_STAMP"}, {"slot": 1, "plate_id": "AC_PATH"}]
		inspection["repair_synthesis_complete"] = false
		data["investigation_state"] = inspection
		var progress_restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(progress_restored.restore(data), "inspection progress save must restore")
		t.equal(progress_restored.snapshot().get("investigation_state"), inspection, "inspection progress must round-trip without reset")
	t.truthy(not restored.restore({"schema_version": 99, "scene_id": "SCN-G01-00"}), "future schema must be rejected")
	t.truthy(not restored.restore({"schema_version": 1, "scene_id": "SCN-G01-00"}), "version-1 prototype saves must be rejected")
	t.truthy(not restored.restore({"schema_version": 2}), "missing scene id must be rejected")
	var missing_investigation_state = data.duplicate(true)
	missing_investigation_state.erase("investigation_state")
	t.truthy(not restored.restore(missing_investigation_state), "version-2 saves must include the investigation depth state")
	var missing_math_state = data.duplicate(true)
	missing_math_state.erase("math_state")
	t.truthy(not restored.restore(missing_math_state), "version-2 saves must include the math depth state")

	_test_rejects_malformed_depth_state(t, state)
	_test_restored_world_requires_ready_repair(t)
	_test_post_protector_transition_resumes(t)
	_test_rejects_forged_terminal_phase(t)
	_test_rejects_persisted_deduction_bypasses(t)
	_test_valid_partial_forensic_resume(t, state)
	_test_stage_cycle_contract(t)
	_test_rejects_legacy_pre_depth_saves(t)

func _test_restored_world_requires_ready_repair(t) -> void:
	for view in ["COCKPIT", "EVIDENCE", "CABINET", "POWER_PANEL", "SIGNAL_VERIFY"]:
		var forged = preload("res://scripts/core/GameState.gd").new().snapshot()
		forged["world_state"] = "POWER_RESTORED"
		forged["scene_phase"] = "POWER_RESTORED"
		forged["current_view"] = view
		var restored = preload("res://scripts/core/GameState.gd").new()
		var before: Dictionary = restored.snapshot()
		t.truthy(not restored.restore(forged), "a default diagnostic cannot forge restored power from %s" % view)
		t.equal(restored.snapshot(), before, "rejected restored-power save must not mutate live state from %s" % view)
	var ready = _post_protector_state(t).snapshot()
	var cases := [
		{"field": "b_isolated", "value": false},
		{"field": "fuse_installed", "value": false},
		{"field": "coupler_angle", "value": 0.0},
		{"field": "protector_on", "value": false},
	]
	for missing in cases:
		var malformed = ready.duplicate(true)
		malformed["device_state"][missing["field"]] = missing["value"]
		t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(malformed), "restored cockpit must reject incomplete physical repair: %s" % missing["field"])
	var no_device = ready.duplicate(true)
	no_device.erase("device_state")
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(no_device), "restored power cannot omit physical repair state")
	var unlocked_diagnostic = ready.duplicate(true)
	unlocked_diagnostic["math_state"]["window_locked"] = false
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(unlocked_diagnostic), "physical repair cannot bypass an unlocked diagnostic in the cockpit")

func _test_post_protector_transition_resumes(t) -> void:
	var reached = _post_protector_state(t)
	for view in ["COCKPIT", "SIGNAL_VERIFY"]:
		reached.current_view = view
		var restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(restored.restore(reached.snapshot()), "a real post-protector %s save must resume" % view)
		t.equal(restored.snapshot(), reached.snapshot(), "restoration must preserve the complete post-protector state")
		var receiver = preload("res://scripts/puzzle/DualSignalVerificationPuzzle.gd").new(restored, {"cycle_size": 12, "weak_echo_offset": -1})
		t.truthy(receiver.adjust_gain("maintenance", 1).ok, "resumed %s player can operate the receiver" % view)

func _post_protector_state(t):
	var state = preload("res://scripts/core/GameState.gd").new()
	t.truthy(state.restore(_fully_reachable_deduction_snapshot()))
	state.scene_phase = "REPAIR"
	state.current_view = "POWER_PANEL"
	state.inventory_item_ids.append("ITM-G01-002")
	var panel = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(state)
	t.truthy(panel.set_b_isolated(true).ok)
	var config = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00_math.json"))
	var diagnostic = preload("res://scripts/puzzle/SignalWindowPuzzle.gd").new(state, config)
	t.truthy(diagnostic.prepare_probe(true, true).ok)
	t.truthy(diagnostic.confirm_origin().ok)
	t.truthy(diagnostic.set_echo_caliper(6, 5).ok)
	t.truthy(diagnostic.confirm_echo_measurement().ok)
	for tick in [0, 3, 7, 8]:
		t.truthy(diagnostic.toggle_blockade_mark(tick).ok)
	t.truthy(diagnostic.confirm_blockade_overlay().ok)
	for index in 3:
		t.truthy(diagnostic.set_window(index, [1, 5, 9][index]).ok)
	t.truthy(diagnostic.lock_windows(true).ok)
	t.truthy(panel.install_fuse("ITM-G01-002").ok)
	t.truthy(panel.set_coupler_angle(90.0).ok)
	panel.power_restored.connect(func():
		state.scene_phase = "POWER_RESTORED"
		state.current_view = "COCKPIT"
	)
	t.truthy(panel.toggle_protector().ok)
	panel.free()
	return state

func _test_rejects_forged_terminal_phase(t) -> void:
	var phase_forged = preload("res://scripts/core/GameState.gd").new().snapshot()
	phase_forged["scene_phase"] = "SLICE_COMPLETE"
	phase_forged["current_view"] = "COCKPIT"
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(phase_forged), "a default unsealed snapshot cannot forge the terminal scene phase")

	var sealed_terminal_outside_phase = _terminal_math_snapshot()
	sealed_terminal_outside_phase["scene_phase"] = "POWER_RESTORED"
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(sealed_terminal_outside_phase), "a sealed retained terminal record must remain bound to the terminal phase")

	var sealed_terminal_outside_cockpit = _terminal_math_snapshot()
	sealed_terminal_outside_cockpit["current_view"] = "CABINET"
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(sealed_terminal_outside_cockpit), "a sealed retained terminal record must remain bound to the cockpit")

func _terminal_math_snapshot() -> Dictionary:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.scene_phase = "SLICE_COMPLETE"
	state.world_state = "POWER_RESTORED"
	state.current_view = "COCKPIT"
	state.device_state = {"b_isolated": true, "fuse_installed": true, "coupler_angle": 90.0, "protector_on": true}
	state.installed_item_ids.append("ITM-G01-002")
	state.math_state = _math_state_for_stage("complete", 3)
	return state.snapshot()

func _test_rejects_persisted_deduction_bypasses(t) -> void:
	var bypass = preload("res://scripts/core/GameState.gd").new().snapshot()
	bypass["unlocked_deduction_ids"] = ["DED-004"]
	var bypass_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not bypass_restored.restore(bypass), "persisted DED-004 cannot bypass an incomplete synthesis and empty authored graph")

	var all_ids_missing_prerequisite = _fully_reachable_deduction_snapshot()
	all_ids_missing_prerequisite["analyzed_clue_ids"] = []
	var near_miss_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not near_miss_restored.restore(all_ids_missing_prerequisite), "all deduction IDs cannot bypass DED-001's analyzed clue prerequisite")
	var ded_002_missing_edge = preload("res://scripts/core/GameState.gd").new().snapshot()
	ded_002_missing_edge["observed_clue_ids"] = ["CLUE-002", "CLUE-003"]
	ded_002_missing_edge["unlocked_deduction_ids"] = ["DED-002"]
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(ded_002_missing_edge), "DED-002 cannot persist without its exact observed-clue support edge")

	var unknown_id = preload("res://scripts/core/GameState.gd").new().snapshot()
	unknown_id["unlocked_deduction_ids"] = ["DED-999"]
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(unknown_id), "unknown persisted deduction IDs are rejected")
	var duplicate_id = preload("res://scripts/core/GameState.gd").new().snapshot()
	duplicate_id["unlocked_deduction_ids"] = ["DED-001", "DED-001"]
	duplicate_id["observed_clue_ids"] = ["CLUE-001"]
	duplicate_id["analyzed_clue_ids"] = ["CLUE-001"]
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(duplicate_id), "duplicate persisted deduction IDs are rejected")

	var fabricated_edge = preload("res://scripts/core/GameState.gd").new().snapshot()
	fabricated_edge["deduction_edges"] = [{"from": "CLUE-001", "to": "CLUE-004", "relation": "supports"}]
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(fabricated_edge), "a well-shaped but unauthored deduction edge is rejected")
	var duplicate_edge = preload("res://scripts/core/GameState.gd").new().snapshot()
	var edge := {"from": "CLUE-002", "to": "CLUE-003", "relation": "supports"}
	duplicate_edge["deduction_edges"] = [edge.duplicate(), edge.duplicate()]
	t.truthy(not preload("res://scripts/core/GameState.gd").new().restore(duplicate_edge), "duplicate authored deduction edges are rejected")

	var reachable = _fully_reachable_deduction_snapshot()
	var reachable_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(reachable_restored.restore(reachable), "a fully reachable four-deduction snapshot remains resumable")
	t.equal(reachable_restored.unlocked_deduction_ids, ["DED-001", "DED-002", "DED-003", "DED-004"], "valid restore preserves the authored deduction IDs")

func _fully_reachable_deduction_snapshot() -> Dictionary:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.observed_clue_ids.assign(["CLUE-001", "CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"])
	state.analyzed_clue_ids.assign(["CLUE-001"])
	state.deduction_edges.assign([
		{"from": "CLUE-002", "to": "CLUE-003", "relation": "supports"},
		{"from": "CLUE-007", "to": "CLUE-006", "relation": "supersedes"},
		{"from": "DED-002", "to": "CLUE-004", "relation": "supports"},
		{"from": "CLUE-004", "to": "CLUE-005", "relation": "supports"},
	])
	state.unlocked_deduction_ids.assign(["DED-001", "DED-002", "DED-003", "DED-004"])
	state.investigation_state["repair_synthesis_steps"] = [
		{"slot": 0, "plate_id": "REV3_STAMP"},
		{"slot": 1, "plate_id": "AC_PATH"},
		{"slot": 2, "plate_id": "FUSE_SPEC"},
	]
	state.investigation_state["repair_synthesis_complete"] = true
	return state.snapshot()

func _test_rejects_malformed_depth_state(t, state) -> void:
	var cases := [
		{"name": "burn hold outside its normalized range", "path": ["investigation_state", "burn_hold_progress"], "value": 1.01},
		{"name": "duplicate tape reel order", "path": ["investigation_state", "tape_order"], "value": [0, 0, 2]},
		{"name": "trace node outside the six-node plate", "path": ["investigation_state", "plate_trace_nodes"], "value": [6]},
		{"name": "unknown measurement stage", "path": ["math_state", "measurement_stage"], "value": "calibration"},
		{"name": "duplicate blockade marks", "path": ["math_state", "blockade_marks"], "value": [3, 3]},
		{"name": "complete stage without all observation cycles", "path": ["math_state", "observed_cycles"], "value": 2},
		{"name": "complete stage with unlocked windows", "path": ["math_state", "window_locked"], "value": false},
		{"name": "complete stage with an incomplete diagnostic", "path": ["math_state", "probe_prepared"], "value": false},
	]
	for case_data in cases:
		var malformed = state.snapshot()
		malformed[case_data["path"][0]][case_data["path"][1]] = case_data["value"]
		var restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(not restored.restore(malformed), "%s must be rejected" % case_data["name"])
	var weak_before_maintenance = state.snapshot()
	weak_before_maintenance["math_state"]["signal_verification"]["maintenance_locked"] = false
	weak_before_maintenance["math_state"]["signal_verification"]["maintenance_gain"] = 0
	weak_before_maintenance["math_state"]["signal_verification"]["weak_gain"] = 2
	weak_before_maintenance["math_state"]["signal_verification"]["weak_phase"] = 11
	weak_before_maintenance["math_state"]["signal_verification"]["weak_locked"] = true
	var weak_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not weak_restored.restore(weak_before_maintenance), "weak signal cannot lock before maintenance")
	var sealed_without_both_channels = state.snapshot()
	sealed_without_both_channels["math_state"]["signal_verification"]["sealed"] = true
	sealed_without_both_channels["math_state"]["signal_verification"]["retained_channels"] = ["maintenance"]
	var sealed_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not sealed_restored.restore(sealed_without_both_channels), "sealed signal requires both retained channels")
	var locked_wrong_baseline = state.snapshot()
	locked_wrong_baseline["investigation_state"]["burn_baseline"] = [1, 2, 2, 2]
	locked_wrong_baseline["investigation_state"]["burn_baseline_locked"] = true
	var baseline_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not baseline_restored.restore(locked_wrong_baseline), "burn baseline cannot lock before the fixed calibration target")
	var verified_wrong_tape_faces = state.snapshot()
	verified_wrong_tape_faces["investigation_state"]["tape_order"] = [1, 0, 2]
	verified_wrong_tape_faces["investigation_state"]["tape_positions"] = [2, 0, 2]
	verified_wrong_tape_faces["investigation_state"]["tape_verified"] = true
	var tape_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not tape_restored.restore(verified_wrong_tape_faces), "tape run cannot verify before the fixed reel faces align")
	var split_without_retained_locks = state.snapshot()
	split_without_retained_locks["math_state"]["signal_split"] = true
	split_without_retained_locks["math_state"]["signal_verification"] = {
		"maintenance_gain": 0,
		"maintenance_locked": false,
		"weak_gain": 0,
		"weak_phase": 0,
		"weak_locked": false,
		"retained_channels": [],
		"sealed": false,
	}
	var split_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not split_restored.restore(split_without_retained_locks), "split signal requires both retained channel locks")
	var terminal_without_seal = state.snapshot()
	terminal_without_seal["scene_phase"] = "SLICE_COMPLETE"
	terminal_without_seal["current_view"] = "COCKPIT"
	terminal_without_seal["math_state"]["signal_verification"]["sealed"] = false
	var unsealed_terminal_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not unsealed_terminal_restored.restore(terminal_without_seal), "a completed split cannot restore without the irreversible record seal")
	var completed_without_split = state.snapshot()
	completed_without_split["math_state"]["signal_split"] = false
	var incomplete_terminal_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not incomplete_terminal_restored.restore(completed_without_split), "a completed terminal state must retain its sealed signal split")
	var missing_cover_field = state.snapshot()
	missing_cover_field["investigation_state"].erase("plate_cover_lifted")
	var missing_cover_restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(not missing_cover_restored.restore(missing_cover_field), "schema-v2 investigation state requires the cover-lift boolean")
	var malformed_forensic_cases := [
		{"name": "out-of-order burn prefix", "burn": [2], "locked": true, "active": -1, "hold": 0.0, "latches": [false, false], "cover": false, "trace": []},
		{"name": "burn progress before baseline lock", "burn": [0], "locked": false, "active": -1, "hold": 0.0, "latches": [false, false], "cover": false, "trace": []},
		{"name": "active burn point not equal to exact next point", "burn": [0], "locked": true, "active": 2, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "idle burn head with nonzero progress", "burn": [], "locked": true, "active": -1, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "completed burn scan with active progress", "burn": [0, 1, 2, 3], "locked": true, "active": 3, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "impossible right-before-left latch state", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [false, true], "cover": false, "trace": []},
		{"name": "lifted cover without both released latches", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, false], "cover": true, "trace": []},
		{"name": "plate trace before cover lift", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, true], "cover": false, "trace": [0]},
		{"name": "out-of-order plate trace prefix", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, true], "cover": true, "trace": [0, 3]},
	]
	for case_data in malformed_forensic_cases:
		var malformed = state.snapshot()
		malformed["investigation_state"]["burn_scan_points"] = case_data["burn"]
		malformed["investigation_state"]["burn_baseline"] = [1, 2, 2, 3] if case_data["locked"] else [0, 0, 0, 0]
		malformed["investigation_state"]["burn_baseline_locked"] = case_data["locked"]
		malformed["investigation_state"]["burn_active_point"] = case_data["active"]
		malformed["investigation_state"]["burn_hold_progress"] = case_data["hold"]
		malformed["investigation_state"]["plate_latches"] = case_data["latches"]
		malformed["investigation_state"]["plate_cover_lifted"] = case_data["cover"]
		malformed["investigation_state"]["plate_trace_nodes"] = case_data["trace"]
		var malformed_restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(not malformed_restored.restore(malformed), "%s must be rejected" % case_data["name"])

func _test_restored_world_phase_consistency(t) -> void:
	var fixture = _post_protector_state(t)
	for phase in ["REPAIR", "EXPLORE", "MISSING"]:
		var snapshot: Dictionary = fixture.snapshot()
		snapshot["current_view"] = "COCKPIT"
		if phase == "MISSING":
			snapshot.erase("scene_phase")
		else:
			snapshot["scene_phase"] = phase
		var live = preload("res://scripts/core/GameState.gd").new()
		var before: Dictionary = live.snapshot()
		var decoded = JSON.parse_string(JSON.stringify(snapshot))
		t.truthy(not live.restore(decoded), "restored-world cockpit cannot carry a pre-restoration phase: " + phase)
		t.equal(live.snapshot(), before, "rejected phase preserves the live save state")

func _test_valid_partial_forensic_resume(t, state) -> void:
	var partial = state.snapshot()
	partial["investigation_state"]["burn_baseline"] = [1, 2, 2, 3]
	partial["investigation_state"]["burn_baseline_locked"] = true
	partial["investigation_state"]["burn_scan_points"] = [0]
	partial["investigation_state"]["burn_active_point"] = 1
	partial["investigation_state"]["burn_hold_progress"] = 0.5
	partial["investigation_state"]["plate_latches"] = [true, true]
	partial["investigation_state"]["plate_cover_lifted"] = true
	partial["investigation_state"]["plate_trace_nodes"] = [0, 2]
	var restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(restored.restore(partial), "valid exact-prefix burn and plate partial progress must restore")
	t.equal(restored.snapshot()["investigation_state"], partial["investigation_state"], "valid forensic partial progress must round-trip unchanged")

func _test_stage_cycle_contract(t) -> void:
	var exact_counts := {"origin": 0, "echo": 1, "blockade": 2, "windows": 3, "complete": 3}
	for stage in exact_counts:
		var valid = preload("res://scripts/core/GameState.gd").new().snapshot()
		valid["math_state"] = _math_state_for_stage(stage, exact_counts[stage])
		if stage == "complete":
			valid["scene_phase"] = "SLICE_COMPLETE"
			valid["world_state"] = "POWER_RESTORED"
			valid["current_view"] = "COCKPIT"
			valid["device_state"] = {"b_isolated": true, "fuse_installed": true, "coupler_angle": 90.0, "protector_on": true}
			valid["installed_item_ids"] = ["ITM-G01-002"]
		var valid_restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(valid_restored.restore(valid), "exact %s-stage cycle count must restore" % stage)
		t.equal(valid_restored.math_state, valid["math_state"], "valid %s-stage progress must round-trip unchanged" % stage)
	var mismatches := [
		{"stage": "origin", "count": -1, "kind": "under"},
		{"stage": "origin", "count": 1, "kind": "over"},
		{"stage": "echo", "count": 0, "kind": "under"},
		{"stage": "echo", "count": 2, "kind": "over"},
		{"stage": "blockade", "count": 1, "kind": "under"},
		{"stage": "blockade", "count": 3, "kind": "over"},
		{"stage": "windows", "count": 0, "kind": "soft-lock"},
		{"stage": "windows", "count": 2, "kind": "under"},
		{"stage": "windows", "count": 4, "kind": "over"},
		{"stage": "complete", "count": 2, "kind": "under"},
		{"stage": "complete", "count": 4, "kind": "over"},
	]
	for mismatch in mismatches:
		var malformed = preload("res://scripts/core/GameState.gd").new().snapshot()
		malformed["math_state"] = _math_state_for_stage(mismatch["stage"], mismatch["count"])
		var restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(not restored.restore(malformed), "%s %s-stage cycle count must be rejected" % [mismatch["kind"], mismatch["stage"]])

func _test_rejects_legacy_pre_depth_saves(t) -> void:
	for split_signal in [false, true]:
		var legacy = preload("res://scripts/core/GameState.gd").new().snapshot()
		legacy["math_state"] = _legacy_pre_depth_math_state(split_signal)
		var restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(not restored.restore(legacy), "legacy %s shape must not bypass staged measurements" % ("post-split" if split_signal else "post-lock"))

func _math_state_for_stage(stage: String, count: int) -> Dictionary:
	var math_state: Dictionary = preload("res://scripts/core/GameState.gd").new().math_state.duplicate(true)
	math_state["measurement_stage"] = stage
	math_state["observed_cycles"] = count
	math_state["probe_prepared"] = stage != "origin"
	if stage in ["blockade", "windows", "complete"]:
		math_state["echo_measurement"] = {"pulse": 6, "echo": 5, "confirmed": true}
	if stage in ["windows", "complete"]:
		math_state["blockade_marks"] = [0, 3, 7, 8]
	if stage == "complete":
		math_state["sample_windows"] = [1, 5, 9]
		math_state["window_locked"] = true
		math_state["completed"] = true
		math_state["signal_split"] = true
		math_state["signal_verification"] = {
			"maintenance_gain": 3,
			"maintenance_locked": true,
			"weak_gain": 2,
			"weak_phase": 11,
			"weak_locked": true,
			"retained_channels": ["maintenance", "weak"],
			"sealed": true,
		}
	return math_state

func _legacy_pre_depth_math_state(split_signal: bool) -> Dictionary:
	var math_state: Dictionary = preload("res://scripts/core/GameState.gd").new().math_state.duplicate(true)
	math_state["probe_prepared"] = true
	math_state["observed_cycles"] = 3
	math_state["sample_windows"] = [1, 5, 9]
	math_state["window_locked"] = true
	math_state["completed"] = true
	math_state["signal_split"] = split_signal
	return math_state
