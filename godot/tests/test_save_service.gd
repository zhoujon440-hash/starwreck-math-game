extends RefCounted

const SAVE_PATH := "user://test_save_01.json"
const TITLE_SAVE_PATH := "user://test_title_save_01.json"
func run(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.scene_phase = "REPAIR"
	state.observed_clue_ids.assign(["CLUE-001", "CLUE-004"])
	var service = preload("res://scripts/core/SaveService.gd").new(SAVE_PATH)
	_cleanup()
	t.equal(service.save_state(state), OK)
	var loaded = service.load_state()
	t.equal(loaded.get("scene_phase"), "REPAIR")
	t.equal(loaded.get("observed_clue_ids"), ["CLUE-001", "CLUE-004"])
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	file.store_string("{broken")
	file.close()
	t.equal(service.load_state(), {}, "corrupt save must recover safely")
	var malformed_latches = state.snapshot()
	malformed_latches["investigation_state"]["fuse_latches"] = []
	_write_json(SAVE_PATH, malformed_latches)
	var malformed_latch_inspection = service.inspect_state()
	t.truthy(not malformed_latch_inspection.get("valid", true), "empty fuse-latch shape must not be resumable")
	t.equal(malformed_latch_inspection.get("reason"), "unsupported_state", "malformed nested arrays must be classified as unsupported state")
	var malformed_observations = state.snapshot()
	malformed_observations["investigation_state"]["inspection_observations"] = "not-a-dictionary"
	_write_json(SAVE_PATH, malformed_observations)
	var malformed_type_inspection = service.inspect_state()
	t.truthy(not malformed_type_inspection.get("valid", true), "wrong nested field type must not be resumable")
	t.equal(malformed_type_inspection.get("reason"), "unsupported_state", "wrong nested types must be classified as unsupported state")
	var malformed_window_count = state.snapshot()
	malformed_window_count["math_state"] = _valid_math_state()
	malformed_window_count["math_state"]["sample_windows"] = [1, 5]
	_write_json(SAVE_PATH, malformed_window_count)
	var malformed_window_count_inspection = service.inspect_state()
	t.truthy(not malformed_window_count_inspection.get("valid", true), "short sample windows must not be resumable")
	t.equal(malformed_window_count_inspection.get("reason"), "unsupported_state", "short sample windows must be classified as unsupported state")
	var malformed_observed_cycles = state.snapshot()
	malformed_observed_cycles["math_state"] = _valid_math_state()
	malformed_observed_cycles["math_state"]["observed_cycles"] = "2"
	_write_json(SAVE_PATH, malformed_observed_cycles)
	var malformed_observed_cycles_inspection = service.inspect_state()
	t.truthy(not malformed_observed_cycles_inspection.get("valid", true), "string observation counts must not be resumable")
	t.equal(malformed_observed_cycles_inspection.get("reason"), "unsupported_state", "string observation counts must be classified as unsupported state")
	var malformed_tier = state.snapshot()
	malformed_tier["math_state"] = _valid_math_state()
	malformed_tier["math_state"]["support_tier"] = "grade-3"
	_write_json(SAVE_PATH, malformed_tier)
	var malformed_tier_inspection = service.inspect_state()
	t.truthy(not malformed_tier_inspection.get("valid", true), "grade-label tiers must not be resumable")
	t.equal(malformed_tier_inspection.get("reason"), "unsupported_state", "grade-label tiers must be classified as unsupported state")
	var malformed_depth_signal = state.snapshot()
	malformed_depth_signal["math_state"]["signal_verification"]["sealed"] = true
	malformed_depth_signal["math_state"]["signal_verification"]["retained_channels"] = ["maintenance"]
	_write_json(SAVE_PATH, malformed_depth_signal)
	var malformed_depth_signal_inspection = service.inspect_state()
	t.truthy(not malformed_depth_signal_inspection.get("valid", true), "a sealed one-channel signal must not be resumable")
	t.equal(malformed_depth_signal_inspection.get("reason"), "unsupported_state", "impossible depth signal state must be classified as unsupported state")
	var unsealed_terminal = state.snapshot()
	unsealed_terminal["scene_phase"] = "SLICE_COMPLETE"
	unsealed_terminal["math_state"] = _math_state_for_stage("complete", 3)
	unsealed_terminal["math_state"]["signal_verification"]["sealed"] = false
	_write_json(SAVE_PATH, unsealed_terminal)
	var unsealed_terminal_inspection = service.inspect_state()
	t.truthy(not unsealed_terminal_inspection.get("valid", true), "an unsealed completed signal record must not be resumable")
	t.equal(unsealed_terminal_inspection.get("reason"), "unsupported_state", "unsealed terminal records are classified as unsupported state")
	t.equal(service.load_state(), {}, "unsealed terminal JSON cannot enter the runtime")
	var phase_forged = preload("res://scripts/core/GameState.gd").new().snapshot()
	phase_forged["scene_phase"] = "SLICE_COMPLETE"
	phase_forged["current_view"] = "COCKPIT"
	_write_json(SAVE_PATH, phase_forged)
	var phase_forged_inspection = service.inspect_state()
	t.truthy(not phase_forged_inspection.get("valid", true), "a default snapshot cannot forge the terminal phase in JSON")
	t.equal(phase_forged_inspection.get("reason"), "unsupported_state", "forged terminal phase JSON is classified as unsupported state")
	t.equal(service.load_state(), {}, "forged terminal phase JSON cannot enter the runtime")
	var missing_investigation_state = state.snapshot()
	missing_investigation_state.erase("investigation_state")
	_write_json(SAVE_PATH, missing_investigation_state)
	var missing_investigation_inspection = service.inspect_state()
	t.truthy(not missing_investigation_inspection.get("valid", true), "a v2 save without investigation depth state must not be resumable")
	t.equal(missing_investigation_inspection.get("reason"), "unsupported_state", "missing investigation depth state must be classified as unsupported state")
	var missing_math_state = state.snapshot()
	missing_math_state.erase("math_state")
	_write_json(SAVE_PATH, missing_math_state)
	var missing_math_inspection = service.inspect_state()
	t.truthy(not missing_math_inspection.get("valid", true), "a v2 save without math depth state must not be resumable")
	t.equal(missing_math_inspection.get("reason"), "unsupported_state", "missing math depth state must be classified as unsupported state")
	_test_forensic_malformed_saves_do_not_load(t, service, state)
	_test_valid_partial_forensic_save(t, service, state)
	_test_repair_synthesis_file_round_trip(t, service)
	_test_stage_cycle_file_contract(t, service)
	_test_rejects_legacy_pre_depth_files(t, service)
	_test_restored_power_file_contract(t, service)
	_cleanup()
	_cleanup_title_save()
	var corrupt_title_save = FileAccess.open(TITLE_SAVE_PATH, FileAccess.WRITE)
	corrupt_title_save.store_string("{broken")
	corrupt_title_save.close()
	var title = load("res://scenes/main/Main.tscn").instantiate()
	var title_service = preload("res://scripts/core/SaveService.gd").new(TITLE_SAVE_PATH)
	title.set("save_service", title_service)
	t.truthy(title.has_method("_refresh_continue_state"), "title must validate a save before offering Continue")
	if title.has_method("_refresh_continue_state"):
		title._refresh_continue_state()
	t.truthy(title.get_node("TitleLayout/Continue").disabled, "corrupt save must not enable Continue")
	t.truthy(title.has_node("TitleLayout/SaveNotice"), "title must explain why a corrupt save cannot continue")
	if title.has_node("TitleLayout/SaveNotice"):
		t.truthy(title.get_node("TitleLayout/SaveNotice").text.contains("损坏"), "corrupt-save notice must give a clear recovery reason")
	var continue_requests: Array[bool] = []
	title.continue_requested.connect(func(): continue_requests.append(true))
	title._on_continue_pressed()
	t.equal(continue_requests.size(), 0, "corrupt save must not emit a continue request")
	var reached = preload("res://tests/test_game_state.gd").new()._post_protector_state(t)
	t.equal(title_service.save_state(reached), OK)
	title._refresh_continue_state()
	t.truthy(not title.get_node("TitleLayout/Continue").disabled, "valid post-protector save at the injected path enables Continue")
	t.truthy(not title.get_node("TitleLayout/SaveNotice").visible, "a valid injected save clears the corrupt-save notice")
	var forged = preload("res://scripts/core/GameState.gd").new().snapshot()
	forged["world_state"] = "POWER_RESTORED"
	forged["scene_phase"] = "POWER_RESTORED"
	forged["current_view"] = "COCKPIT"
	_write_json(TITLE_SAVE_PATH, forged)
	title._on_continue_pressed()
	t.truthy(title.get_node("TitleLayout/Continue").disabled, "malformed restored-world progress cannot enable Continue")
	t.equal(continue_requests.size(), 0, "forged restored power cannot request a scene resume")
	title.free()
	_cleanup_title_save()

func _test_restored_power_file_contract(t, service) -> void:
	var forged = preload("res://scripts/core/GameState.gd").new().snapshot()
	forged["world_state"] = "POWER_RESTORED"
	forged["scene_phase"] = "POWER_RESTORED"
	forged["current_view"] = "COCKPIT"
	_write_json(SAVE_PATH, forged)
	var inspection = service.inspect_state()
	t.truthy(not inspection.get("valid", true), "forged restored cockpit JSON must not enable resume")
	t.equal(inspection.get("reason"), "unsupported_state", "incomplete restored-world readiness is unsupported state")
	t.equal(service.load_state(), {}, "forged restored cockpit JSON cannot enter the runtime")
	var reached = preload("res://tests/test_game_state.gd").new()._post_protector_state(t)
	for view in ["COCKPIT", "SIGNAL_VERIFY"]:
		reached.current_view = view
		t.equal(service.save_state(reached), OK, "real post-protector %s state must write" % view)
		var restored = preload("res://scripts/core/GameState.gd").new()
		t.truthy(restored.restore(service.load_state()), "real post-protector %s JSON must remain resumable" % view)
		t.equal(restored.math_state, reached.math_state, "post-protector JSON preserves the complete diagnostic")
		t.equal(restored.device_state, reached.device_state, "post-protector JSON preserves physical repair")
		t.equal(restored.installed_item_ids, ["ITM-G01-002"], "post-protector JSON keeps the fuse installed")
		var receiver = preload("res://scripts/puzzle/DualSignalVerificationPuzzle.gd").new(restored, {"cycle_size": 12, "weak_echo_offset": -1})
		t.truthy(receiver.adjust_gain("maintenance", 1).ok, "receiver remains operable after %s file restore" % view)

func _cleanup() -> void:
	for path in [SAVE_PATH, SAVE_PATH.replace(".json", ".tmp")]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

func _write_json(path: String, data: Dictionary) -> void:
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(data))
	file.close()

func _valid_math_state() -> Dictionary:
	return {
		"support_tier": "standard",
		"task_id": "SCN-G01-00-MATH-01",
		"probe_prepared": true,
		"observed_cycles": 2,
		"sample_windows": [1, 5, 0],
		"window_locked": false,
		"completed": false,
		"signal_split": false,
		"attempt_codes": ["BLOCKADE_COLLISION"],
		"hint_stage": 1,
		"measurement_stage": "blockade",
		"origin_tick": 0,
		"echo_measurement": {"pulse": 6, "echo": 5, "confirmed": true},
		"blockade_marks": [],
		"signal_verification": {
			"maintenance_gain": 0,
			"maintenance_locked": false,
			"weak_gain": 0,
			"weak_phase": 0,
			"weak_locked": false,
			"retained_channels": [],
			"sealed": false,
		},
	}

func _test_forensic_malformed_saves_do_not_load(t, service, state) -> void:
	var cases := [
		{"name": "out-of-order burn prefix", "burn": [2], "locked": true, "active": -1, "hold": 0.0, "latches": [false, false], "cover": false, "trace": []},
		{"name": "burn progress before baseline lock", "burn": [0], "locked": false, "active": -1, "hold": 0.0, "latches": [false, false], "cover": false, "trace": []},
		{"name": "mismatched burn hold head", "burn": [0], "locked": true, "active": 2, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "idle burn head with nonzero progress", "burn": [], "locked": true, "active": -1, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "completed burn scan with active progress", "burn": [0, 1, 2, 3], "locked": true, "active": 3, "hold": 0.5, "latches": [false, false], "cover": false, "trace": []},
		{"name": "right latch released first", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [false, true], "cover": false, "trace": []},
		{"name": "lifted cover without both latches", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, false], "cover": true, "trace": []},
		{"name": "trace before cover lift", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, true], "cover": false, "trace": [0]},
		{"name": "out-of-order plate prefix", "burn": [], "locked": false, "active": -1, "hold": 0.0, "latches": [true, true], "cover": true, "trace": [0, 3]},
	]
	for case_data in cases:
		var malformed = state.snapshot()
		malformed["investigation_state"]["burn_scan_points"] = case_data["burn"]
		malformed["investigation_state"]["burn_baseline"] = [1, 2, 2, 3] if case_data["locked"] else [0, 0, 0, 0]
		malformed["investigation_state"]["burn_baseline_locked"] = case_data["locked"]
		malformed["investigation_state"]["burn_active_point"] = case_data["active"]
		malformed["investigation_state"]["burn_hold_progress"] = case_data["hold"]
		malformed["investigation_state"]["plate_latches"] = case_data["latches"]
		malformed["investigation_state"]["plate_cover_lifted"] = case_data["cover"]
		malformed["investigation_state"]["plate_trace_nodes"] = case_data["trace"]
		_write_json(SAVE_PATH, malformed)
		var inspection = service.inspect_state()
		t.truthy(not inspection.get("valid", true), "%s must not be resumable" % case_data["name"])
		t.equal(inspection.get("reason"), "unsupported_state", "%s must be classified as unsupported state" % case_data["name"])
		t.equal(service.load_state(), {}, "%s must return no loadable state" % case_data["name"])
	var missing_cover = state.snapshot()
	missing_cover["investigation_state"].erase("plate_cover_lifted")
	_write_json(SAVE_PATH, missing_cover)
	var missing_cover_inspection = service.inspect_state()
	t.truthy(not missing_cover_inspection.get("valid", true), "missing schema-v2 cover state must not be resumable")
	t.equal(missing_cover_inspection.get("reason"), "unsupported_state", "missing schema-v2 cover state is classified as unsupported")
	t.equal(service.load_state(), {}, "missing schema-v2 cover state must not load")

func _test_valid_partial_forensic_save(t, service, state) -> void:
	var partial = state.snapshot()
	partial["investigation_state"]["burn_baseline"] = [1, 2, 2, 3]
	partial["investigation_state"]["burn_baseline_locked"] = true
	partial["investigation_state"]["burn_scan_points"] = [0]
	partial["investigation_state"]["burn_active_point"] = 1
	partial["investigation_state"]["burn_hold_progress"] = 0.5
	partial["investigation_state"]["plate_latches"] = [true, true]
	partial["investigation_state"]["plate_cover_lifted"] = true
	partial["investigation_state"]["plate_trace_nodes"] = [0, 2]
	_write_json(SAVE_PATH, partial)
	var inspection = service.inspect_state()
	t.truthy(inspection.get("valid", false), "valid exact-prefix forensic progress remains resumable")
	var loaded_investigation: Dictionary = service.load_state().get("investigation_state", {})
	t.equal(loaded_investigation.get("burn_scan_points"), [0], "SaveService preserves the valid burn prefix")
	t.equal(int(loaded_investigation.get("burn_active_point", -1)), 1, "SaveService preserves the exact active burn head")
	t.truthy(is_equal_approx(float(loaded_investigation.get("burn_hold_progress", 0.0)), 0.5), "SaveService preserves partial burn hold progress")
	t.equal(loaded_investigation.get("plate_latches"), [true, true], "SaveService preserves both released plate latches")
	t.equal(loaded_investigation.get("plate_cover_lifted"), true, "SaveService preserves the lifted plate cover")
	t.equal(loaded_investigation.get("plate_trace_nodes"), [0, 2], "SaveService preserves the valid plate trace prefix")

func _test_repair_synthesis_file_round_trip(t, service) -> void:
	_cleanup()
	var state = preload("res://scripts/core/GameState.gd").new()
	state.observed_clue_ids.assign(["CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"])
	state.unlocked_deduction_ids.assign(["DED-003"])
	state.deduction_edges.assign([{"from": "CLUE-007", "to": "CLUE-006", "relation": "supersedes"}])
	var puzzle = preload("res://scripts/puzzle/RepairSynthesisPuzzle.gd").new(state)
	t.truthy(puzzle.place_plate(0, "REV3_STAMP").ok)
	t.truthy(puzzle.place_plate(1, "AC_PATH").ok)
	t.equal(service.save_state(state), OK, "two-plate synthesis writes through the real SaveService")
	var partial_loaded: Dictionary = service.load_state()
	t.equal(_synthesis_mapping(partial_loaded.get("investigation_state", {}).get("repair_synthesis_steps", [])), {
		0: "REV3_STAMP",
		1: "AC_PATH",
	}, "file-backed resume preserves the exact two occupied slots")
	var resumed_state = preload("res://scripts/core/GameState.gd").new()
	t.truthy(resumed_state.restore(partial_loaded), "file-backed two-plate synthesis restores into GameState")
	var resumed_puzzle = preload("res://scripts/puzzle/RepairSynthesisPuzzle.gd").new(resumed_state)
	t.truthy(resumed_puzzle.place_plate(2, "FUSE_SPEC").ok)
	t.truthy(resumed_puzzle.press_record().completed)
	t.equal(service.save_state(resumed_state), OK, "completed synthesis writes through the real SaveService")
	var completed_loaded: Dictionary = service.load_state()
	t.truthy(not completed_loaded.is_empty(), "completed synthesis remains loadable after JSON numeric normalization")
	t.truthy(completed_loaded.get("investigation_state", {}).get("repair_synthesis_complete", false), "file-backed completed synthesis keeps its strict completion flag")
	t.equal(_synthesis_mapping(completed_loaded.get("investigation_state", {}).get("repair_synthesis_steps", [])), {
		0: "REV3_STAMP",
		1: "AC_PATH",
		2: "FUSE_SPEC",
	}, "file-backed completed synthesis preserves all three exact slots")
	var near_miss = resumed_state.snapshot()
	near_miss["investigation_state"]["repair_synthesis_steps"] = [
		{"slot": 0, "plate_id": "REV3_STAMP"},
		{"slot": 1, "plate_id": "FUSE_SPEC"},
		{"slot": 2, "plate_id": "AC_PATH"},
	]
	_write_json(SAVE_PATH, near_miss)
	var near_miss_inspection: Dictionary = service.inspect_state()
	t.truthy(not near_miss_inspection.get("valid", true), "complete flag with a swapped path/spec mapping remains malformed")
	t.equal(near_miss_inspection.get("reason"), "unsupported_state", "near-miss completed mapping is classified as unsupported state")
	t.equal(service.load_state(), {}, "near-miss completed mapping cannot enter the runtime")

	var persisted_bypass = preload("res://scripts/core/GameState.gd").new().snapshot()
	persisted_bypass["unlocked_deduction_ids"] = ["DED-004"]
	_write_json(SAVE_PATH, persisted_bypass)
	var bypass_inspection: Dictionary = service.inspect_state()
	t.truthy(not bypass_inspection.get("valid", true), "file-backed DED-004 cannot bypass incomplete synthesis and missing authored prerequisites")
	t.equal(bypass_inspection.get("reason"), "unsupported_state", "persisted DED-004 bypass is classified as unsupported state")
	t.equal(service.load_state(), {}, "persisted DED-004 bypass returns no loadable state")

	var all_ids_missing_prerequisite = _fully_reachable_deduction_snapshot()
	all_ids_missing_prerequisite["deduction_edges"].erase(all_ids_missing_prerequisite["deduction_edges"][1])
	_write_json(SAVE_PATH, all_ids_missing_prerequisite)
	var near_graph_inspection: Dictionary = service.inspect_state()
	t.truthy(not near_graph_inspection.get("valid", true), "all deduction IDs cannot bypass DED-003's authored supersedes edge")
	t.equal(near_graph_inspection.get("reason"), "unsupported_state", "all-ID graph near miss is classified as unsupported state")
	t.equal(service.load_state(), {}, "all-ID graph near miss returns no loadable state")

	var reachable = _fully_reachable_deduction_snapshot()
	_write_json(SAVE_PATH, reachable)
	var reachable_inspection: Dictionary = service.inspect_state()
	t.truthy(reachable_inspection.get("valid", false), "fully reachable authored deduction progress remains file-backed resumable")
	var reachable_loaded: Dictionary = service.load_state()
	t.equal(reachable_loaded.get("unlocked_deduction_ids", []), ["DED-001", "DED-002", "DED-003", "DED-004"], "valid file reload preserves all reachable deduction IDs")
	t.truthy(reachable_loaded.get("investigation_state", {}).get("repair_synthesis_complete", false), "valid file reload preserves completed synthesis")

func _synthesis_mapping(steps: Array) -> Dictionary:
	var mapping := {}
	for step in steps:
		mapping[int(step["slot"])] = str(step["plate_id"])
	return mapping

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

func _test_stage_cycle_file_contract(t, service) -> void:
	var exact_counts := {"origin": 0, "echo": 1, "blockade": 2, "windows": 3, "complete": 3}
	for stage in exact_counts:
		_cleanup()
		var valid_state = preload("res://scripts/core/GameState.gd").new()
		valid_state.math_state = _math_state_for_stage(stage, exact_counts[stage])
		if stage == "complete":
			valid_state.scene_phase = "SLICE_COMPLETE"
			valid_state.world_state = "POWER_RESTORED"
			valid_state.current_view = "COCKPIT"
			valid_state.device_state = {"b_isolated": true, "fuse_installed": true, "coupler_angle": 90.0, "protector_on": true}
			valid_state.installed_item_ids.append("ITM-G01-002")
		t.equal(service.save_state(valid_state), OK, "valid %s-stage state must write" % stage)
		var valid_inspection = service.inspect_state()
		t.truthy(valid_inspection.get("valid", false), "valid %s-stage file must inspect as resumable" % stage)
		t.equal(valid_inspection.get("data", {}).get("math_state"), valid_state.math_state, "valid %s-stage file must round-trip unchanged" % stage)
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
		_write_json(SAVE_PATH, malformed)
		var inspection = service.inspect_state()
		t.truthy(not inspection.get("valid", true), "%s %s-stage file must not be resumable" % [mismatch["kind"], mismatch["stage"]])
		t.equal(inspection.get("reason"), "unsupported_state", "cycle mismatch must be classified as unsupported state")

func _test_rejects_legacy_pre_depth_files(t, service) -> void:
	for split_signal in [false, true]:
		var legacy = preload("res://scripts/core/GameState.gd").new().snapshot()
		legacy["math_state"] = _legacy_pre_depth_math_state(split_signal)
		_write_json(SAVE_PATH, legacy)
		var inspection = service.inspect_state()
		t.truthy(not inspection.get("valid", true), "legacy %s file must not bypass staged measurements" % ("post-split" if split_signal else "post-lock"))
		t.equal(inspection.get("reason"), "unsupported_state", "legacy diagnostic bypass must be classified as unsupported state")
		t.equal(service.load_state(), {}, "rejected legacy diagnostic file must never load")

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

func _cleanup_title_save() -> void:
	for path in [TITLE_SAVE_PATH, TITLE_SAVE_PATH.replace(".json", ".tmp")]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
