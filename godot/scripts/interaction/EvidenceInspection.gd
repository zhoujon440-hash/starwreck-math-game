class_name EvidenceInspection
extends Control

signal clue_completed(clue_id: String)
signal close_requested
signal state_changed

var state: RefCounted
var mechanics: RefCounted
var forensic_config: Dictionary = {}
var current_clue := ""
var ready_to_record := false
var active_burn_point := -1
var last_feedback_code := ""

func _ready() -> void:
	for index in 3:
		get_node("Workbench/ObservationRail/Detail%d" % index).pressed.connect(_on_observation_detail.bind(index))
		get_node("Workbench/HypothesisRail/Hypothesis%d" % index).pressed.connect(_on_hypothesis.bind(index))
	for index in 4:
		get_node("Workbench/BurnPanel/Baseline%d" % index).pressed.connect(_on_baseline_adjust.bind(index))
		get_node("Workbench/BurnPanel/Scan%d" % index).pressed.connect(_on_burn_scan_pressed.bind(index))
	$Workbench/BurnPanel/BaselineLock.pressed.connect(_on_baseline_lock)
	for index in 3:
		get_node("Workbench/TapePanel/Reel%d" % index).pressed.connect(_on_tape_reel.bind(index))
	$Workbench/TapePanel/SwapLeft.pressed.connect(_on_tape_swap.bind(0))
	$Workbench/TapePanel/SwapRight.pressed.connect(_on_tape_swap.bind(1))
	$Workbench/TapePanel/RunLever.pressed.connect(_on_tape_run)
	$Workbench/PlatePanel/LatchLeft.pressed.connect(_on_plate_latch.bind(0))
	$Workbench/PlatePanel/LatchRight.pressed.connect(_on_plate_latch.bind(1))
	$Workbench/PlatePanel/LiftCover.pressed.connect(_on_plate_lift)
	for index in 6:
		get_node("Workbench/PlatePanel/TraceNode%d" % index).pressed.connect(_on_trace_node.bind(index))
	$Workbench/RecordEvidence.pressed.connect(_on_record_pressed)
	$Workbench/Close.pressed.connect(close_inspection)

func setup(game_state: RefCounted, config: Dictionary) -> void:
	state = game_state
	forensic_config = config.duplicate(true)
	# JSON arrays contain floats; normalize physical IDs before identity lookups.
	for key in ["burn_baseline_target", "tape_order_target", "tape_positions_target", "plate_trace_target"]:
		var ids: Array = []
		for value in forensic_config.get(key, []):
			ids.append(int(value))
		forensic_config[key] = ids
	mechanics = preload("res://scripts/interaction/EvidenceInspectionMechanics.gd").new(state, forensic_config)

func open_inspection(clue_id: String) -> void:
	if state == null or clue_id not in ["CLUE-002", "CLUE-003", "CLUE-004"]:
		return
	current_clue = clue_id
	active_burn_point = -1
	last_feedback_code = ""
	ready_to_record = mechanics.evidence_operation_complete(clue_id) and clue_id not in state.observed_clue_ids
	visible = true
	$Workbench/BurnPanel.visible = clue_id == "CLUE-002"
	$Workbench/TapePanel.visible = clue_id == "CLUE-003"
	$Workbench/PlatePanel.visible = clue_id == "CLUE-004"
	$Workbench/Title.text = {
		"CLUE-002": "定向烧蚀扫描 · 热层基线与稳定方向",
		"CLUE-003": "七码机械浪涌纸带 · 时标排序与跨缝复原",
		"CLUE-004": "百工星环 Rev.3 铭牌 · 泄压后批准路径追踪",
	}.get(clue_id, "现场证据检视")
	$Workbench/Instructions.text = {
		"CLUE-002": "先调平四段未受损金属基线并锁定，再沿外壳到 B 母线的箭头逐点点亮扫描头；再次确认同一点即可锁住该方向。",
		"CLUE-003": "先交换相邻纸卷使机械时标连续，再逐卷转面；拉下走带杆复核两道接缝。",
		"CLUE-004": "按左泄压锁、右锁、抬盖的顺序打开铭牌，再让机械触针沿连续批准槽前进。",
	}.get(clue_id, "")
	var labels: Array = {
		"CLUE-002": ["外壳方向刻痕", "灼蚀色阶", "B 母线入口"],
		"CLUE-003": ["进纸时标", "两道压线", "末卷浪涌峰"],
		"CLUE-004": ["旧 B→C 蚀刻", "后压 Rev.3 戳", "A↔C 批准箭头"],
	}.get(clue_id, [])
	for index in 3:
		get_node("Workbench/ObservationRail/Detail%d" % index).text = str(labels[index])
	var hypotheses: Array = {
		"CLUE-002": ["内部老化向外爆裂", "封锁光网由外切入 B", "维修时热斑残留"],
		"CLUE-003": ["主电恢复后的测试峰", "纸带被人为拼接", "进近时浪涌由 B 灌入"],
		"CLUE-004": ["Rev.3 取消旧旁路", "旧 B→C 仍应优先", "铭牌只记录外观"],
	}.get(clue_id, [])
	for index in 3:
		get_node("Workbench/HypothesisRail/Hypothesis%d" % index).text = str(hypotheses[index])
	if clue_id in state.observed_clue_ids:
		$Workbench/Readout.text = "该证据已归档。机构状态仍可复查。"
	elif ready_to_record:
		$Workbench/Readout.text = "独特实体检视已完成；按记录键归档证据。"
	else:
		$Workbench/Readout.text = "设备等待人工比较。"
	_refresh_controls()

func _on_hypothesis(index: int) -> void:
	var result: Dictionary = mechanics.choose_evidence_hypothesis(current_clue, index)
	if result.changed:
		state_changed.emit()
	if result.ok:
		$Workbench/Readout.text = "解释与三项表面信息一致。实体检视机构已解锁。"
	else:
		$Workbench/Readout.text = _hypothesis_feedback(current_clue, index)
	_refresh_controls()

func _hypothesis_feedback(clue_id: String, index: int) -> String:
	var comparisons := {
		"CLUE-002:0": "内部老化通常从带电母线向外翻卷，但这里最外层先白化、灼痕箭头朝舱内，终点又压在 B 支路入口；三处方向相反，不能解释成内部爆裂。",
		"CLUE-002:2": "维修热斑应围绕焊点形成近圆色阶，不会留下由船壳切口向内收束的连续箭头；白化层覆盖旧焦痕，也证明这是后来的高能外部冲击。",
		"CLUE-003:0": "若是主电恢复后的测试峰，报码应晚于恢复记录；机械时标却把末卷峰值锁在领航舱断电之前，并紧跟 B 支路报码，时间顺序不成立。",
		"CLUE-003:1": "人为拼接会让进纸时标或两道压线发生跳号；当前时标连续、压纹也跨缝吻合，真正需要复原的是三卷波形位置，而不是怀疑纸带来源。",
		"CLUE-004:1": "旧 B→C 蚀刻确实存在，但后压 Rev.3 戳年代更晚，且批准箭头已经改成 A↔C；继续优先旧旁路会把已确认损坏的 B 支路重新带电。",
		"CLUE-004:2": "这块铭牌不仅记录外观：双锁泄压顺序、后压复检戳和 A↔C 批准箭头共同规定实体操作；忽略它会绕过百工星环改装后的安全约束。",
	}
	return str(comparisons.get("%s:%d" % [clue_id, index], "这项解释无法同时说明三处细节。比较方向、时序与改装年代后再判断。"))

func _on_observation_detail(index: int) -> void:
	var result: Dictionary = mechanics.observe_evidence_detail(current_clue, index)
	if not result.ok:
		return
	if result.changed:
		state_changed.emit()
	var detail_texts: Dictionary = {
		"CLUE-002": ["切口外缘先熔，箭头朝舱内收束：不是内部短路向外爆开。", "白化层覆在红黑焦痕上方，符合封锁光网的高能瞬时切入。", "轨迹终点压在 B 支路入舱端；下一步先建立未受损金属基线。"],
		"CLUE-003": ["七码机械时标仍连续，纸带不是断电后被人拼接的。", "两道压线分别来自进近前后；波峰需要跨缝连续才能成立。", "末卷峰值在 B 支路报码之后出现，先排序三卷再校正转面。"],
		"CLUE-004": ["底层蚀刻仍写 B→C 快修，这是星宇过去熟悉的旧做法。", "Rev.3 是百工星环改装后的后压复检戳，年代晚于旧蚀刻。", "批准箭头改为备用 A↔C；双锁泄压后还需沿批准槽追踪。"],
	}
	$Workbench/Readout.text = detail_texts[current_clue][index]
	if result.completed:
		$Workbench/Readout.text += "\n三项表面信息已完成比较，可以选择解释。"
	_refresh_controls()

func _on_baseline_adjust(index: int) -> void:
	var result: Dictionary = mechanics.calibrate_burn_segment(index, 1)
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_baseline_lock() -> void:
	var result: Dictionary = mechanics.lock_burn_baseline()
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_burn_hold_started(index: int) -> void:
	active_burn_point = index

func _on_burn_hold_released(index: int) -> void:
	if active_burn_point == index:
		active_burn_point = -1

func _on_burn_scan_pressed(index: int) -> void:
	if mechanics == null:
		return
	var result: Dictionary = mechanics.toggle_burn_scan_point(index)
	if result.changed:
		state_changed.emit()
	if not result.ok:
		_show_feedback(result.feedback)
	elif result.completed:
		_set_ready("四点稳定扫描闭合：冲击从船外沿 B 支路灌入。请记录证据。")
	else:
		if result.feedback == "scan_point_armed":
			$Workbench/Readout.text = "扫描头已落位；再次确认同一点即可锁住该方向。"
		else:
			_show_feedback(result.feedback)
	active_burn_point = int(state.investigation_state.get("burn_active_point", -1))
	_refresh_controls()

func _on_tape_swap(left_index: int) -> void:
	var result: Dictionary = mechanics.swap_tape_reels(left_index)
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_tape_reel(index: int) -> void:
	var result: Dictionary = mechanics.cycle_tape_reel(index)
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_tape_run() -> void:
	var result: Dictionary = mechanics.verify_tape_run()
	if result.changed:
		state_changed.emit()
	if result.completed:
		_set_ready("三码时标、卷面与跨缝波峰同时连续：最后浪涌由 B 支路进入。请记录证据。")
	else:
		_show_feedback(result.feedback)
	_refresh_controls()

func _on_plate_latch(index: int) -> void:
	var result: Dictionary = mechanics.toggle_plate_latch(index)
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_plate_lift() -> void:
	var result: Dictionary = mechanics.lift_revision_cover()
	if result.changed:
		state_changed.emit()
	_show_feedback(result.feedback)
	_refresh_controls()

func _on_trace_node(index: int) -> void:
	var result: Dictionary = mechanics.trace_plate_node(index)
	if result.changed:
		state_changed.emit()
	if result.completed:
		_set_ready("触针越过 Rev.3 复检戳并到达备用槽：A↔C 是批准恢复路径。请记录证据。")
	else:
		_show_feedback(result.feedback)
	_refresh_controls()

func close_inspection() -> void:
	active_burn_point = -1
	visible = false
	close_requested.emit()

func _on_record_pressed() -> void:
	if not ready_to_record or current_clue in state.observed_clue_ids:
		return
	clue_completed.emit(current_clue)
	ready_to_record = false
	$Workbench/RecordEvidence.visible = false
	close_inspection()

func _set_ready(message: String) -> void:
	ready_to_record = current_clue not in state.observed_clue_ids
	$Workbench/Readout.text = message
	$Workbench/RecordEvidence.visible = ready_to_record

func _show_feedback(code: String) -> void:
	last_feedback_code = code.to_upper()
	var messages := {
		"BASELINE_UNSTABLE": "四段热层还没有同时落入参考带；已调好的段位保持。",
		"BASELINE_SEGMENT_ADJUSTED": "基线段位已转动；比较四段热层颜色。",
		"BASELINE_READY": "四段热层进入同一参考带，可以锁定基线。",
		"BASELINE_LOCKED": "基线已机械锁定；先点亮下一枚扫描头，再确认稳定。",
		"SCAN_POINT_ARMED": "扫描头已落位；再次确认同一点即可锁住该方向。",
		"SCAN_DIRECTION_REJECTED": "扫描头被方向槽顶回；已确认点和当前稳定度保持。",
		"SCAN_POINT_CONFIRMED": "该方向已稳定锁住；沿烧蚀箭头继续向舱内。",
		"TRACE_REEL_ADVANCED": "纸卷转过一档；检查波峰是否跨过两道接缝。",
		"TAPE_REELS_SWAPPED": "相邻纸卷已换位；对照连续时标判断左右顺序。",
		"TAPE_ORDER_ALIGNED": "七码时标顺序连续；继续校正三卷波形面。",
		"TAPE_ORDER_MISMATCH": "走带在时标接缝处停住；卷面保留，先修正左右顺序。",
		"TRACE_BREAKS_AT_SEAM": "触针或波形在旧接缝处中断；已确认路径保持。",
		"TRACE_DEAD_END": "机械触针进入无批准戳的盲槽并被顶回；连续节点保持。",
		"PRESSURE_LATCH_FIRST": "右锁仍受余压顶住；先释放左侧泄压锁。",
		"PLATE_LATCH_RELEASED": "铭牌锁已释放；检查另一侧机械锁。",
		"COVER_STILL_LATCHED": "Rev.3 盖板仍遮住触针槽；先释放双锁并抬起盖板。",
		"REVISION_TRACE_EXPOSED": "盖板抬起；批准刻槽与旧 B→C 断槽同时显露。",
		"TRACE_NODE_CONFIRMED": "触针沿批准刻槽前进；继续寻找连续节点。",
	}
	$Workbench/Readout.text = "[%s] %s" % [last_feedback_code, messages.get(last_feedback_code, "机构状态保持，可继续检查。")]
	_play_feedback_tone(last_feedback_code)

func _play_feedback_tone(code: String) -> void:
	if not is_inside_tree():
		return
	$FeedbackAudio.play()
	var playback = $FeedbackAudio.get_stream_playback()
	if playback == null:
		return
	var frequency := 230.0
	if code.begins_with("TAPE") or code == "TRACE_BREAKS_AT_SEAM":
		frequency = 155.0
	elif code.begins_with("TRACE") or code.begins_with("PLATE") or code.begins_with("REVISION"):
		frequency = 340.0
	var frames := int(22050.0 * 0.055)
	for index in frames:
		var envelope := 1.0 - float(index) / float(frames)
		var sample := sin(TAU * frequency * float(index) / 22050.0) * 0.08 * envelope
		playback.push_frame(Vector2(sample, sample))

func _refresh_controls() -> void:
	if mechanics == null or current_clue.is_empty():
		return
	var observations: Dictionary = state.investigation_state.get("inspection_observations", {})
	var observed_details: Array = observations.get(current_clue, [])
	for index in 3:
		var detail: Button = get_node("Workbench/ObservationRail/Detail%d" % index)
		detail.disabled = index in observed_details
		detail.text = "✓ %s" % detail.text.trim_prefix("✓ ") if detail.disabled else detail.text
	var details_complete: bool = mechanics.evidence_details_complete(current_clue)
	var hypothesis_confirmed: bool = mechanics.evidence_hypothesis_confirmed(current_clue)
	for index in 3:
		var hypothesis: Button = get_node("Workbench/HypothesisRail/Hypothesis%d" % index)
		hypothesis.disabled = not details_complete or hypothesis_confirmed

	var baseline: Array = state.investigation_state.get("burn_baseline", [0, 0, 0, 0])
	var baseline_locked := bool(state.investigation_state.get("burn_baseline_locked", false))
	var baseline_target: Array = forensic_config.get("burn_baseline_target", [1, 2, 2, 3])
	for index in 4:
		var calibration: Button = get_node("Workbench/BurnPanel/Baseline%d" % index)
		calibration.text = "基线 %d\n档位 %d" % [index + 1, int(baseline[index])]
		calibration.disabled = not hypothesis_confirmed or baseline_locked
		var heat: Line2D = get_node("Workbench/BurnPanel/Heat%d" % index)
		var error := int(baseline_target[index]) - int(baseline[index])
		var heat_y := 48.0 + error * 10.0
		var heat_x := 62.0 + index * 148.0
		heat.points = PackedVector2Array([Vector2(heat_x, heat_y), Vector2(heat_x + 110.0, heat_y)])
		heat.default_color = Color(0.34, 0.94, 0.76) if error == 0 else (Color(0.39, 0.66, 0.94) if error > 0 else Color(0.96, 0.42, 0.18))
	$Workbench/BurnPanel/BaselineLock.disabled = not hypothesis_confirmed or baseline_locked
	$Workbench/BurnPanel/BaselineLock.text = "基线已锁" if baseline_locked else "锁定四段基线"
	var burn_progress := float(state.investigation_state.get("burn_hold_progress", 0.0))
	var armed_point := int(state.investigation_state.get("burn_active_point", -1))
	$Workbench/BurnPanel/HoldMeter.value = 50.0 if armed_point >= 0 and is_zero_approx(burn_progress) else burn_progress * 100.0
	var scanned: Array = state.investigation_state.get("burn_scan_points", [])
	for index in 4:
		var scan: Button = get_node("Workbench/BurnPanel/Scan%d" % index)
		scan.disabled = not hypothesis_confirmed or not baseline_locked or index in scanned
		scan.text = "✓ 稳定" if index in scanned else ("确认 %d" % (index + 1) if index == armed_point else "点亮 %d" % (index + 1))

	var tape: Array = state.investigation_state.get("tape_positions", [0, 0, 0])
	var order: Array = state.investigation_state.get("tape_order", [0, 1, 2])
	var tape_verified := bool(state.investigation_state.get("tape_verified", false))
	var order_target: Array = forensic_config.get("tape_order_target", [])
	var face_target: Array = forensic_config.get("tape_positions_target", [])
	for index in 3:
		var reel: Button = get_node("Workbench/TapePanel/Reel%d" % index)
		var time_index := order_target.find(int(order[index]))
		reel.get_node("TimeMark").text = "卷 %s · 00:0%d" % [char(65 + int(order[index])), time_index + 1]
		_refresh_tape_face(reel, time_index, int(tape[index]), int(face_target[time_index]))
		reel.disabled = not hypothesis_confirmed or tape_verified
	$Workbench/TapePanel/SwapLeft.disabled = not hypothesis_confirmed or tape_verified
	$Workbench/TapePanel/SwapRight.disabled = not hypothesis_confirmed or tape_verified
	$Workbench/TapePanel/RunLever.disabled = not hypothesis_confirmed or tape_verified
	for seam_index in 2:
		var seam: ColorRect = get_node("Workbench/TapePanel/SeamLight%d" % seam_index)
		var order_ok := order.size() == order_target.size() and int(order[seam_index]) == int(order_target[seam_index]) and int(order[seam_index + 1]) == int(order_target[seam_index + 1])
		var faces_ok := tape.size() == face_target.size() and int(tape[seam_index]) == int(face_target[seam_index]) and int(tape[seam_index + 1]) == int(face_target[seam_index + 1])
		seam.color = Color(0.22, 0.84, 0.62, 0.95) if order_ok and faces_ok else Color(0.88, 0.42, 0.16, 0.8)

	var plate: Array = state.investigation_state.get("plate_latches", [false, false])
	$Workbench/PlatePanel/LatchLeft.text = "左锁 · 已泄压" if plate[0] else "左锁 · 泄压"
	$Workbench/PlatePanel/LatchRight.text = "右锁 · 已释放" if plate[1] else "右锁 · 释放"
	$Workbench/PlatePanel/LatchLeft.disabled = not hypothesis_confirmed or bool(plate[0])
	$Workbench/PlatePanel/LatchRight.disabled = not hypothesis_confirmed or bool(plate[1])
	var latches_released := hypothesis_confirmed and bool(plate[0]) and bool(plate[1])
	var cover_lifted := bool(state.investigation_state.get("plate_cover_lifted", false))
	var plate_open := latches_released and cover_lifted
	for surface in ["ApprovedGroove", "OldGrooveStart", "OldGrooveEnd", "BlindGroove", "BreakScar"]:
		get_node("Workbench/PlatePanel/" + surface).visible = plate_open
	$Workbench/PlatePanel/TraceLine.visible = plate_open
	$Workbench/PlatePanel/LiftCover.disabled = not latches_released or cover_lifted
	$Workbench/PlatePanel/LiftCover.text = "盖板已抬起 · 触针已接入" if cover_lifted else "抬起 Rev.3 盖板"
	$Workbench/PlatePanel/Plate.modulate.a = 0.32 if cover_lifted else 1.0
	var traced: Array = state.investigation_state.get("plate_trace_nodes", [])
	for index in 6:
		var node: Button = get_node("Workbench/PlatePanel/TraceNode%d" % index)
		node.visible = plate_open
		node.disabled = not plate_open or index in traced
		var socket_labels := ["A 入口", "旧 B", "Rev.3", "C 桥", "盲槽", "备用槽"]
		node.text = ("✓ " if index in traced else "") + str(socket_labels[index])
	var trace_points := PackedVector2Array()
	for traced_index in traced:
		var traced_node: Button = get_node("Workbench/PlatePanel/TraceNode%d" % int(traced_index))
		trace_points.append(traced_node.position + traced_node.size * 0.5)
	$Workbench/PlatePanel/TraceLine.points = trace_points
	if not traced.is_empty():
		var last_node: Button = get_node("Workbench/PlatePanel/TraceNode%d" % int(traced.back()))
		$Workbench/PlatePanel/TraceProbe.position = last_node.position + last_node.size * 0.5
	$Workbench/PlatePanel/TraceProbe.visible = plate_open and not traced.is_empty()

	if mechanics.evidence_operation_complete(current_clue) and current_clue not in state.observed_clue_ids:
		ready_to_record = true
	$Workbench/RecordEvidence.visible = ready_to_record

func _refresh_tape_face(reel: Button, time_index: int, face: int, aligned_face: int) -> void:
	# Each physical paper fragment retains its own stamped traces when moved.
	# Faces shift both embossed lines and the recorded surge relative to the seam.
	var face_offset := posmod(face - aligned_face, 3)
	if face_offset == 2:
		face_offset = -1
	var displacement: float = float(face_offset) * [9.0, 7.0, 13.0][time_index]
	var upper_ends := [Vector2(45, 55), Vector2(55, 45), Vector2(45, 55)]
	var lower_ends := [Vector2(140, 132), Vector2(132, 140), Vector2(140, 132)]
	for trace_data in [["UpperPressLine", upper_ends], ["LowerPressLine", lower_ends]]:
		var ends: Vector2 = trace_data[1][time_index]
		reel.get_node(trace_data[0]).points = PackedVector2Array([Vector2(0, ends.x + displacement), Vector2(284, ends.y + displacement)])
	var waves := [
		PackedVector2Array([Vector2(0, 118), Vector2(40, 118), Vector2(66, 108), Vector2(104, 108), Vector2(150, 118), Vector2(196, 118), Vector2(244, 100), Vector2(284, 100)]),
		PackedVector2Array([Vector2(0, 100), Vector2(48, 100), Vector2(80, 108), Vector2(110, 108), Vector2(140, 98), Vector2(178, 98), Vector2(216, 82), Vector2(284, 82)]),
		PackedVector2Array([Vector2(0, 82), Vector2(38, 82), Vector2(76, 104), Vector2(112, 64), Vector2(142, 104), Vector2(174, 82), Vector2(210, 118), Vector2(284, 118)]),
	]
	var wave: PackedVector2Array = waves[time_index]
	for point in wave.size():
		wave[point].y += displacement
	reel.get_node("SurgeTrace").points = wave
