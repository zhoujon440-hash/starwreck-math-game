extends RefCounted

func _guidance_state() -> RefCounted:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.inventory_item_ids.append("ITM-G01-001")
	return state

func _set_all_clues(state: RefCounted) -> void:
	for clue_id in ["CLUE-001", "CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		if clue_id not in state.observed_clue_ids:
			state.observed_clue_ids.append(clue_id)

func _set_all_deductions(state: RefCounted) -> void:
	for deduction_id in ["DED-001", "DED-002", "DED-003", "DED-004"]:
		if deduction_id not in state.unlocked_deduction_ids:
			state.unlocked_deduction_ids.append(deduction_id)

func run(t) -> void:
	var script = load("res://scripts/core/HintService.gd")
	t.truthy(script != null, "tiered anti-stuck hint service must exist")
	if script == null:
		return
	var state = preload("res://scripts/core/GameState.gd").new()
	var hints = script.new(state)
	t.equal(hints.current_hint(), "", "fresh play must preserve discovery")
	state.elapsed_seconds = 125.0
	t.equal(hints.current_hint(), "应急红光每次扫过，左侧工作台都有一处金属反光。")
	state.elapsed_seconds = 305.0
	t.equal(hints.current_hint(), "先取得手灯，再用光束检查配电箱、记录窗与维修铭牌。")
	state.elapsed_seconds = 545.0
	t.equal(hints.current_hint(), "线索板需要三次主动判断：光网损伤来源、旧标签失效、备用槽规格。")
	t.truthy("90" not in hints.current_hint(), "hints must not reveal the coupler angle")
	t.truthy("supports" not in hints.current_hint(), "hints must not reveal the exact relation choice")

	var diagnostic_state = preload("res://scripts/core/GameState.gd").new()
	diagnostic_state.inventory_item_ids.append("ITM-G01-001")
	for clue_id in ["CLUE-001", "CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		diagnostic_state.observed_clue_ids.append(clue_id)
	diagnostic_state.unlocked_deduction_ids.append("DED-004")
	diagnostic_state.device_state["b_isolated"] = true
	var diagnostic_hints = script.new(diagnostic_state)
	diagnostic_state.elapsed_seconds = 125.0
	t.equal(diagnostic_hints.current_hint(), "重新观察纸带的循环节奏，以及扫光经过时哪些槽位已经被占用。")
	diagnostic_state.elapsed_seconds = 305.0
	t.equal(diagnostic_hints.current_hint(), "比较三枚采样窗之间的间隔：它们是否在十二停位环上保持等距？")
	diagnostic_state.elapsed_seconds = 545.0
	t.equal(diagnostic_hints.current_hint(), "微弱回波总在每次维护脉冲之前一格出现。按这个先后关系调整窗位。")
	for forbidden in ["1,5,9", "[1, 5, 9]", "答案", "得分"]:
		t.truthy(forbidden not in diagnostic_hints.current_hint(), "diagnostic hints must never reveal the target or classroom framing")

	var burn_state = _guidance_state()
	burn_state.current_view = "EVIDENCE"
	burn_state.investigation_state["active_inspection_clue"] = "CLUE-002"
	burn_state.investigation_state["inspection_observations"]["CLUE-002"] = [0, 1, 2]
	burn_state.investigation_state["inspection_hypotheses"]["CLUE-002"] = true
	var burn_hints = script.new(burn_state)
	burn_state.elapsed_seconds = 125.0
	t.equal(burn_hints.current_hint(), "先看四段热层是否落在同一参考带；不稳时先别压基线锁。")
	burn_state.elapsed_seconds = 305.0
	t.equal(burn_hints.current_hint(), "把四段热层调到同一条参考带，再压下基线锁。")
	burn_state.elapsed_seconds = 545.0
	t.equal(burn_hints.current_hint(), "先把当前最偏的那一段调回参考带；只要基线稳定，后面的扫描点会逐段保留。")

	var burn_scan_state = _guidance_state()
	burn_scan_state.current_view = "EVIDENCE"
	burn_scan_state.investigation_state["active_inspection_clue"] = "CLUE-002"
	burn_scan_state.investigation_state["inspection_observations"]["CLUE-002"] = [0, 1, 2]
	burn_scan_state.investigation_state["inspection_hypotheses"]["CLUE-002"] = true
	burn_scan_state.investigation_state["burn_baseline_locked"] = true
	var burn_scan_hints = script.new(burn_scan_state)
	burn_scan_state.elapsed_seconds = 125.0
	t.equal(burn_scan_hints.current_hint(), "烧蚀轨迹要沿切口由外向内逐段确认；先盯住下一段发亮的刻痕。")
	burn_scan_state.elapsed_seconds = 305.0
	t.equal(burn_scan_hints.current_hint(), "先让当前扫描头落在那一段，再在同一点确认稳定；前面确认过的方向不会丢。")
	burn_scan_state.elapsed_seconds = 545.0
	t.equal(burn_scan_hints.current_hint(), "继续按切口收束方向推进下一点；已锁住的段落会保持，不必回头长按重做。")

	var synthesis_state = _guidance_state()
	_set_all_clues(synthesis_state)
	for deduction_id in ["DED-001", "DED-002", "DED-003"]:
		synthesis_state.unlocked_deduction_ids.append(deduction_id)
	var synthesis_hints = script.new(synthesis_state)
	synthesis_state.elapsed_seconds = 125.0
	t.equal(synthesis_hints.current_hint(), "维修记录台要把三种信息对回世界里的三种标签：年代、批准路径、备用槽。")
	synthesis_state.elapsed_seconds = 305.0
	t.equal(synthesis_hints.current_hint(), "先分清哪块铜片证明年代先后，哪块证明 A↔C 路径，哪块证明保险丝规格。")
	synthesis_state.elapsed_seconds = 545.0
	t.equal(synthesis_hints.current_hint(), "先处理最能证明“谁更新”的那块铜片；中间槽只接受批准路径，不会替你给出完整维修顺序。")
	for forbidden in ["REV3_STAMP, AC_PATH, FUSE_SPEC", "slot 0", "slot 1", "slot 2"]:
		t.truthy(forbidden not in synthesis_hints.current_hint(), "synthesis hints must not reveal the full plate mapping")

	var weak_state = _guidance_state()
	_set_all_clues(weak_state)
	_set_all_deductions(weak_state)
	weak_state.world_state = "POWER_RESTORED"
	weak_state.scene_phase = "POWER_RESTORED"
	weak_state.current_view = "SIGNAL_VERIFY"
	weak_state.math_state["measurement_stage"] = "windows"
	weak_state.math_state["observed_cycles"] = 3
	weak_state.math_state["probe_prepared"] = true
	weak_state.math_state["window_locked"] = true
	weak_state.math_state["sample_windows"] = [1, 5, 9]
	weak_state.math_state["origin_tick"] = 0
	weak_state.math_state["echo_measurement"] = {"pulse": 6, "echo": 5, "confirmed": true}
	weak_state.math_state["blockade_marks"] = [0, 3, 7, 8]
	weak_state.math_state["signal_verification"]["maintenance_gain"] = 3
	weak_state.math_state["signal_verification"]["maintenance_locked"] = true
	var weak_hints = script.new(weak_state)
	weak_state.elapsed_seconds = 125.0
	t.equal(weak_hints.current_hint(), "保持维护窄带不动，再把弱回波调到它前一格的前缘。")
	weak_state.elapsed_seconds = 305.0
	t.equal(weak_hints.current_hint(), "弱路需要同时满足幅度和相位；先脱离底噪，再利用“提前一格”的关系锁定。")
	weak_state.elapsed_seconds = 545.0
	t.equal(weak_hints.current_hint(), "维护路已经锁住了；只补弱路那一边，别回头改动已确认的第一条记录。")

	var keep_state = _guidance_state()
	_set_all_clues(keep_state)
	_set_all_deductions(keep_state)
	keep_state.world_state = "POWER_RESTORED"
	keep_state.scene_phase = "POWER_RESTORED"
	keep_state.current_view = "SIGNAL_VERIFY"
	keep_state.math_state["measurement_stage"] = "windows"
	keep_state.math_state["observed_cycles"] = 3
	keep_state.math_state["probe_prepared"] = true
	keep_state.math_state["window_locked"] = true
	keep_state.math_state["sample_windows"] = [1, 5, 9]
	keep_state.math_state["origin_tick"] = 0
	keep_state.math_state["echo_measurement"] = {"pulse": 6, "echo": 5, "confirmed": true}
	keep_state.math_state["blockade_marks"] = [0, 3, 7, 8]
	keep_state.math_state["signal_verification"]["maintenance_gain"] = 3
	keep_state.math_state["signal_verification"]["maintenance_locked"] = true
	keep_state.math_state["signal_verification"]["weak_gain"] = 2
	keep_state.math_state["signal_verification"]["weak_phase"] = 11
	keep_state.math_state["signal_verification"]["weak_locked"] = true
	keep_state.math_state["signal_verification"]["retained_channels"] = ["maintenance"]
	var keep_hints = script.new(keep_state)
	keep_state.elapsed_seconds = 545.0
	t.equal(keep_hints.current_hint(), "已保留的一路会保持不动；补上另一枚保留闸后，封存杆才会接受两条记录。")
	t.truthy("1,5,9" not in keep_hints.current_hint() and "RECORD_SEALED" not in keep_hints.current_hint(), "late receiver hints must stay spoiler-safe")

	var scene_script = load("res://scripts/scenes/SCN_G01_00.gd")
	t.truthy(scene_script != null, "scene orchestration script must load for objective guidance")
	if scene_script != null:
		var scene = scene_script.new()
		var objective_state = _guidance_state()
		scene.state = objective_state
		objective_state.current_view = "EVIDENCE"
		objective_state.investigation_state["active_inspection_clue"] = "CLUE-002"
		objective_state.investigation_state["inspection_observations"]["CLUE-002"] = [0, 1, 2]
		objective_state.investigation_state["inspection_hypotheses"]["CLUE-002"] = true
		t.equal(scene.current_objective_text(), "调平四段热层基线，再锁住烧蚀扫描参考带")
		objective_state.investigation_state["burn_baseline"] = [1, 2, 2, 3]
		objective_state.investigation_state["burn_baseline_locked"] = true
		t.equal(scene.current_objective_text(), "沿四个方向稳定复扫烧蚀切口，确认冲击由外向内")
		_set_all_clues(objective_state)
		for deduction_id in ["DED-001", "DED-002", "DED-003"]:
			if deduction_id not in objective_state.unlocked_deduction_ids:
				objective_state.unlocked_deduction_ids.append(deduction_id)
		objective_state.current_view = "COCKPIT"
		objective_state.investigation_state["active_inspection_clue"] = ""
		t.equal(scene.current_objective_text(), "把年代、批准路径、备用槽三枚校验片压合成维修记录")
		objective_state.investigation_state["repair_synthesis_complete"] = true
		objective_state.unlocked_deduction_ids.append("DED-004")
		objective_state.device_state["b_isolated"] = true
		objective_state.math_state["probe_prepared"] = true
		objective_state.math_state["measurement_stage"] = "echo"
		objective_state.math_state["observed_cycles"] = 1
		objective_state.math_state["origin_tick"] = 0
		t.equal(scene.current_objective_text(), "用双卡尺量出维护脉冲与弱回波的提前一格关系")
		objective_state.math_state["measurement_stage"] = "windows"
		objective_state.math_state["observed_cycles"] = 3
		objective_state.math_state["echo_measurement"] = {"pulse": 6, "echo": 5, "confirmed": true}
		objective_state.math_state["blockade_marks"] = [0, 3, 7, 8]
		t.equal(scene.current_objective_text(), "转动三枚采样窗，避开占用槽并保持等距")
		objective_state.math_state["window_locked"] = true
		t.equal(scene.current_objective_text(), "依据维修记录复核配电机构，让船尾天线安全恢复供电")
		objective_state.world_state = "POWER_RESTORED"
		objective_state.scene_phase = "POWER_RESTORED"
		objective_state.current_view = "SIGNAL_VERIFY"
		t.equal(scene.current_objective_text(), "先把自动维护载波调进绿色参考框并锁定")
		objective_state.math_state["signal_verification"]["maintenance_gain"] = 3
		objective_state.math_state["signal_verification"]["maintenance_locked"] = true
		t.equal(scene.current_objective_text(), "再分离前缘弱回波，把相位停在提前一格的位置")
		objective_state.math_state["signal_verification"]["weak_gain"] = 2
		objective_state.math_state["signal_verification"]["weak_phase"] = 11
		objective_state.math_state["signal_verification"]["weak_locked"] = true
		t.equal(scene.current_objective_text(), "两路记录都先保留，再压下封存杆")
		objective_state.math_state["signal_verification"]["retained_channels"] = ["maintenance"]
		t.equal(scene.current_objective_text(), "第二路记录还未保留；两枚保留闸都压下后才能封存")
		scene.free()
