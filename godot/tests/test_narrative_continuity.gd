extends RefCounted

func run(t) -> void:
	var raw := FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json")
	var data = JSON.parse_string(raw)
	t.truthy(data is Dictionary, "narrative scene data must parse")
	if not data is Dictionary:
		return

	var continuity: Dictionary = data.get("continuity", {})
	var incident: Dictionary = continuity.get("incident", {})
	t.equal(continuity.get("novel_version"), "V3.1 管理员试炼重构版", "story provenance must identify the supplied novel version")
	t.equal(continuity.get("departure"), "百工星环", "the slice must depart from the Chapter 12 refit location")
	t.equal(continuity.get("destination"), "零号地球", "the slice must bridge toward zero Earth")
	t.equal(incident.get("cause"), "封锁光网", "the blackout must be caused by the zero-Earth blockade grid")
	t.equal(incident.get("damaged_branch"), "B", "the external strike must enter through branch B")
	t.truthy(str(continuity.get("certification", "")).contains("不完美") and str(continuity.get("certification", "")).contains("可修正"), "opening provenance must preserve Yinglong's imperfect-but-correctable certification")
	var opening_beats: Array = continuity.get("opening_beats", [])
	t.equal(opening_beats.size(), 2, "the opening must remain at two concise story beats")
	t.truthy(str(opening_beats).contains("准予远航") and str(opening_beats).contains("百工星环") and str(opening_beats).contains("封锁光网"), "opening beats must establish certification, departure, and impact")

	var clues: Array = data.get("clues", [])
	var deductions: Array = data.get("deductions", [])
	t.equal(clues.size(), 7, "story integration must retain exactly seven clues")
	t.equal(deductions.size(), 4, "story integration must retain exactly four deductions")
	var clue_text := str(clues)
	for required in ["最低生命线", "封锁光网", "零号地球", "百工星环", "焊花姐", "鲁班包包", "星宇", "Rev.3"]:
		t.truthy(clue_text.contains(required), "canonized clue set is missing: %s" % required)
	for deduction in deductions:
		var deliberate: bool = not deduction.get("requires_analysis", []).is_empty() or not deduction.get("requires_edges", []).is_empty()
		t.truthy(deliberate, "%s must still require an intentional board action" % deduction.get("id", "deduction"))
	var relations: Array = data.get("valid_relations", [])
	t.truthy(relations.has({"from":"CLUE-007", "to":"CLUE-006", "relation":"supersedes"}), "the Rev.3 mark must supersede the old B-to-C shortcut")

	var signals: Array = data.get("ending_signals", [])
	t.equal(signals.size(), 2, "restoration must expose exactly two contradictory signals")
	if signals.size() == 2:
		t.equal(signals[0].get("channel"), "AUTO-MAINT", "the automated maintenance broadcast must resolve first")
		t.equal(signals[0].get("text"), "如果还有生命听见……请重新启动十二星门……")
		t.equal(signals[1].get("channel"), "WEAK-INTERVENTION", "the weaker intervention must resolve second")
		t.equal(signals[1].get("text"), "文明修复者，请不要来。")
		t.equal(signals[1].get("sender"), "UNKNOWN", "the weaker sender must remain unnamed in this scene")
	var ending_exchange: Array = data.get("ending_exchange", [])
	t.equal(ending_exchange, ["七码：同一方向，两套互相冲突的指令。两条记录都不足以删除。", "星宇：都保留。先打开去领航核心的路，再判断。"], "the retained-record decision must remain authored as the two canonical lines")
	t.truthy(not raw.contains("零零"), "SCN-G01-00 must not reveal the later sender identity")
	t.equal(continuity.get("completion_phase"), "SLICE_COMPLETE")
	t.equal(continuity.get("completion_scene"), "SCN-G01-00")
	t.truthy(not raw.contains("八分钟") and not raw.contains("城市循环"), "this slice must not enter the Chapter 13 city loop")

	var packed = load("res://scenes/g01/SCN_G01_00.tscn")
	t.truthy(packed != null, "story-integrated scene must load")
	if packed == null:
		return
	var scene = packed.instantiate()
	for path in [
		"UI/IncidentBrief",
		"UI/IncidentBrief/Text",
		"UI/DualSignalVerification",
		"UI/DualSignalVerification/MaintenanceCarrier/Message",
		"UI/DualSignalVerification/WeakCarrier/Message",
		"UI/DualSignalVerification/KeepGates/MaintenanceGate",
		"UI/DualSignalVerification/KeepGates/WeakGate",
		"UI/DualSignalVerification/SealLever",
	]:
		t.truthy(scene.has_node(path), "story UI is missing: %s" % path)
	t.truthy(not scene.has_node("UI/DualSignalConsole"), "the old passive timed signal readout must be removed from the scene")
	if scene.has_node("UI/IncidentBrief") and scene.has_node("UI/DualSignalVerification"):
		var incident_panel: Control = scene.get_node("UI/IncidentBrief")
		var signal_panel: Control = scene.get_node("UI/DualSignalVerification")
		t.equal(incident_panel.mouse_filter, Control.MOUSE_FILTER_IGNORE, "opening story beat must never block world inspection")
		t.equal(signal_panel.mouse_filter, Control.MOUSE_FILTER_STOP, "the receiver must exclusively own viewport input")
		for viewport_size in [Vector2(1366, 768), Vector2(1920, 1080)]:
			var scale_factor: float = minf(viewport_size.x / 1920.0, viewport_size.y / 1080.0)
			t.truthy(incident_panel.get_rect().end.x * scale_factor <= viewport_size.x and incident_panel.get_rect().end.y * scale_factor <= viewport_size.y, "opening story content must fit %s" % viewport_size)
			t.truthy(signal_panel.get_rect().end.x * scale_factor <= viewport_size.x and signal_panel.get_rect().end.y * scale_factor <= viewport_size.y, "dual-signal content must fit %s" % viewport_size)
			var signal_font: int = signal_panel.get_node("MaintenanceCarrier/Message").get_theme_font_size("font_size")
			t.truthy(signal_font * scale_factor >= 14.0, "dual-signal copy must remain readable at %s" % viewport_size)
	scene.scene_data = data
	var terminal_exchange: String = scene._terminal_exchange_text()
	t.truthy(terminal_exchange.contains(ending_exchange[0]) and terminal_exchange.contains(ending_exchange[1]), "terminal presentation must consume both authored retained-record lines")
	t.truthy(scene.get_node("UI/CompletionCard/Text").text.contains("航向零号地球"), "completion copy must bridge into the zero-Earth approach")
	scene.free()
