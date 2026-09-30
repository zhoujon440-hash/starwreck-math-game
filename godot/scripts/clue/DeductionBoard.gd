class_name DeductionBoard
extends Control

signal deduction_unlocked(id: String)
signal state_changed

var state: RefCounted
var graph: RefCounted
var cards: Dictionary = {}
var selected_from := ""
var selected_to := ""
var dragging_card: Control = null
var drag_distance := 0.0
var data: Dictionary = {}

@onready var board_canvas: Control = $BoardCanvas
@onready var observed_list: VBoxContainer = $ObservedClues
@onready var selector: HBoxContainer = $RelationSelector
@onready var readout: Label = $LogicReadout/Text
@onready var analyze_button: Button = $Analyze
@onready var synthesis_button: Button = $SynthesisOpen
@onready var synthesis_workbench = $RepairSynthesisWorkbench

func _ready() -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if parsed is Dictionary:
		data = parsed
	for button in selector.get_children():
		button.pressed.connect(_on_relation_selected.bind(button.name.to_lower()))
	$Close.pressed.connect(close_board)
	analyze_button.pressed.connect(_on_analyze_pressed)
	synthesis_button.pressed.connect(open_synthesis)
	synthesis_workbench.close_requested.connect(_on_synthesis_closed)
	synthesis_workbench.synthesis_completed.connect(_on_synthesis_completed)
	synthesis_workbench.state_changed.connect(_on_synthesis_state_changed)

func setup(game_state: RefCounted, deduction_graph: RefCounted) -> void:
	state = game_state
	graph = deduction_graph
	synthesis_workbench.setup(state, data.get("repair_synthesis_workbench", {}))

func open_board() -> void:
	visible = true
	refresh_cards()
	get_tree().paused = true
	if synthesis_workbench.is_unlocked() and not state.investigation_state["repair_synthesis_complete"]:
		open_synthesis()

func close_board() -> void:
	visible = false
	synthesis_workbench.close_workbench()
	selector.visible = false
	analyze_button.visible = false
	_clear_selection()
	get_tree().paused = false

func _unhandled_input(event: InputEvent) -> void:
	if visible and (event.is_action_pressed("toggle_deduction_board") or event.is_action_pressed("ui_cancel")):
		if synthesis_workbench.visible:
			_on_synthesis_closed()
		else:
			close_board()
		get_viewport().set_input_as_handled()

func refresh_cards() -> void:
	if state == null:
		return
	for id in state.observed_clue_ids + state.unlocked_deduction_ids:
		if id not in cards:
			_create_card(id)
	for child in observed_list.get_children():
		child.queue_free()
	for id in state.observed_clue_ids:
		var label = Label.new()
		label.text = "◆ %s" % _title_for(id)
		label.tooltip_text = id
		label.custom_minimum_size = Vector2(228, 52)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_color_override("font_color", Color(0.63, 0.75, 0.78))
		label.add_theme_font_size_override("font_size", 16)
		observed_list.add_child(label)
	synthesis_button.visible = synthesis_workbench.is_unlocked()
	synthesis_button.text = "复核已压合记录" if state.investigation_state["repair_synthesis_complete"] else "打开维修记录压合台"
	_refresh_lines()

func _create_card(id: String) -> void:
	var card = Button.new()
	card.name = id
	card.text = "%s  %s\n%s" % ["推论" if id.begins_with("DED") else "证据", id, _title_for(id)]
	card.custom_minimum_size = Vector2(282, 118)
	card.z_index = 2
	var index = cards.size()
	card.position = Vector2(48 + (index % 4) * 334, 88 + (index / 4) * 176)
	card.tooltip_text = _text_for(id)
	card.add_theme_font_size_override("font_size", 17)
	card.add_theme_color_override("font_color", Color(0.77, 0.91, 0.93))
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.045, 0.105, 0.125, 0.98) if id.begins_with("CLUE") else Color(0.12, 0.09, 0.04, 0.98)
	style.border_color = Color(0.24, 0.62, 0.68, 0.82) if id.begins_with("CLUE") else Color(0.76, 0.53, 0.2, 0.82)
	style.set_border_width_all(2)
	style.set_corner_radius_all(7)
	style.shadow_color = Color(0, 0, 0, 0.58)
	style.shadow_size = 7
	card.add_theme_stylebox_override("normal", style)
	card.gui_input.connect(_on_card_gui_input.bind(card, id))
	board_canvas.add_child(card)
	cards[id] = card

func _on_card_gui_input(event: InputEvent, card: Control, id: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			dragging_card = card
			drag_distance = 0.0
		else:
			dragging_card = null
			if drag_distance < 8.0:
				_select_endpoint(id, card)
	if event is InputEventMouseMotion and dragging_card == card:
		drag_distance += event.relative.length()
		card.position = (card.position + event.relative).clamp(Vector2(20, 68), Vector2(board_canvas.size.x - card.size.x - 20, board_canvas.size.y - card.size.y - 20))
		_refresh_lines()

func _select_endpoint(id: String, card: Control) -> void:
	if selected_from.is_empty():
		selected_from = id
		readout.text = "已选起点：%s。再选一张卡，或对这条证据作单独研判。" % _title_for(id)
		analyze_button.visible = id == "CLUE-001" and id not in state.analyzed_clue_ids
		_highlight_selection()
		return
	if selected_from == id:
		_clear_selection()
		return
	selected_to = id
	analyze_button.visible = false
	selector.position = (card.global_position + Vector2(-340, 126)).clamp(Vector2(760, 150), Vector2(size.x - 590, size.y - 118))
	selector.visible = true
	readout.text = "%s  →  %s：选择一种关系。" % [_title_for(selected_from), _title_for(selected_to)]
	_highlight_selection()

func _on_analyze_pressed() -> void:
	if graph == null or selected_from.is_empty():
		return
	var result = graph.analyze_clue(selected_from)
	if result.accepted:
		readout.text = "研判稳定：应急回路仍证明储能系统可用。"
		_emit_deductions(result.new_deductions)
		state_changed.emit()
	else:
		_rejected_feedback()
	_clear_selection()
	refresh_cards()

func _on_relation_selected(relation: String) -> void:
	if graph == null or selected_from.is_empty() or selected_to.is_empty():
		return
	var result = graph.add_edge(selected_from, selected_to, relation)
	if result.accepted:
		readout.text = "逻辑稳定。关系已保留在工作台上。"
		_emit_deductions(result.new_deductions)
		state_changed.emit()
		refresh_cards()
	else:
		_show_rejected_connection(selected_from, selected_to)
		_rejected_feedback(_rejected_reason(selected_from, selected_to, relation))
	_clear_selection()
	_refresh_lines()

func _emit_deductions(ids: Array) -> void:
	for id in ids:
		deduction_unlocked.emit(str(id))
		if str(id) == "DED-003":
			open_synthesis()

func open_synthesis() -> void:
	if synthesis_workbench.open_workbench():
		selector.visible = false
		analyze_button.visible = false
		readout.text = "维修记录压合台已展开；三枚铜片来自已记录的世界证据。"

func _on_synthesis_closed() -> void:
	synthesis_workbench.close_workbench()
	refresh_cards()

func _on_synthesis_state_changed() -> void:
	state_changed.emit()

func _on_synthesis_completed() -> void:
	var new_deductions: Array[String] = graph.recompute()
	_emit_deductions(new_deductions)
	state_changed.emit()
	refresh_cards()

func _rejected_feedback(message := "") -> void:
	readout.text = message if not message.is_empty() else "逻辑不稳定。连线未保留；换个方向或关系再观察。"
	modulate = Color(1.0, 0.62, 0.58)
	var tween = create_tween()
	tween.tween_property(self, "modulate", Color.WHITE, 0.28)

func _rejected_reason(from_id: String, to_id: String, relation: String) -> String:
	var comparisons := {
		"CLUE-002|CLUE-003|contradicts": "两条记录并不冲突：外壳烧蚀给出冲击空间方向，七码纸带给出断电前后时序；它们都把异常收束到 B 支路，只是测量维度不同。",
		"CLUE-002|CLUE-003|supersedes": "纸带没有取代烧蚀痕，烧蚀痕也没有取代纸带；方向证据与时序证据必须同时保留，才能确认封锁光网从外部经 B 支路灌入。",
		"CLUE-006|CLUE-005|supports": "Rev.3 复检戳不会支持旧手写快修：旧标签允许 B→C，后压复检却明确取消该旁路；年代更晚的正式记录是在纠正旧习惯。",
		"CLUE-006|CLUE-005|contradicts": "仅标成冲突还不足以决定执行哪一条。后压 Rev.3 戳晚于旧手写标签，并且属于百工星环正式复检，因此关系应表达为新版取代旧版。",
		"DED-002|CLUE-004|contradicts": "B 支路受损与 Rev.3 铭牌并不矛盾：推论要求保持 B 隔离，铭牌又把批准恢复路径改为备用 A↔C；两者共同约束安全耦合。",
		"CLUE-004|CLUE-005|supersedes": "Rev.3 铭牌不会取代保险丝规格：铭牌规定 A↔C 路径，焊花姐的公用维修保险丝证明备用槽有匹配器件；二者分工不同、互相支持。",
	}
	return str(comparisons.get("%s|%s|%s" % [from_id, to_id, relation], "逻辑不稳定。连线未保留；这两张卡的方向、时序或版本关系不能支持所选关系。"))

func _show_rejected_connection(from_id: String, to_id: String) -> void:
	var from_card: Control = cards.get(from_id)
	var to_card: Control = cards.get(to_id)
	if from_card == null or to_card == null:
		return
	var start := from_card.position + from_card.size * 0.5
	var finish := to_card.position + to_card.size * 0.5
	var connection_layer = $BoardCanvas/Connections
	for index in range(0, 14, 2):
		var dash = Line2D.new()
		dash.name = "RejectedDash%02d" % index
		dash.z_index = 8
		dash.width = 4.0
		dash.default_color = Color(1.0, 0.16, 0.12, 0.95)
		dash.antialiased = true
		dash.begin_cap_mode = Line2D.LINE_CAP_ROUND
		dash.end_cap_mode = Line2D.LINE_CAP_ROUND
		dash.points = PackedVector2Array([
			start.lerp(finish, float(index) / 14.0),
			start.lerp(finish, float(index + 1) / 14.0),
		])
		connection_layer.add_child(dash)
		var fade = create_tween()
		fade.tween_property(dash, "modulate:a", 0.0, 0.46)
		fade.tween_callback(dash.queue_free)

func _clear_selection() -> void:
	selected_from = ""
	selected_to = ""
	selector.visible = false
	analyze_button.visible = false
	_highlight_selection()

func _highlight_selection() -> void:
	for id in cards:
		var card: Control = cards[id]
		card.modulate = Color(0.55, 0.94, 1.0) if id == selected_from or id == selected_to else Color.WHITE

func _refresh_lines() -> void:
	if state == null:
		return
	var connection_layer = $BoardCanvas/Connections
	for child in connection_layer.get_children():
		if not child.name.begins_with("RejectedDash"):
			child.free()
	for edge in state.deduction_edges:
		var from_card: Control = cards.get(edge.get("from"))
		var to_card: Control = cards.get(edge.get("to"))
		if from_card != null and to_card != null:
			var relation = str(edge.get("relation"))
			var color = Color(0.25, 0.86, 0.92, 0.9) if relation == "supports" else Color(0.95, 0.55, 0.28, 0.9)
			var line = Line2D.new()
			line.width = 4.0
			line.default_color = color
			line.antialiased = true
			line.begin_cap_mode = Line2D.LINE_CAP_ROUND
			line.end_cap_mode = Line2D.LINE_CAP_ROUND
			line.points = PackedVector2Array([from_card.position + from_card.size * 0.5, to_card.position + to_card.size * 0.5])
			connection_layer.add_child(line)

func _title_for(id: String) -> String:
	for section in ["clues", "deductions"]:
		for entry in data.get(section, []):
			if entry.get("id") == id:
				return str(entry.get("title", entry.get("text", "")))
	return id

func _text_for(id: String) -> String:
	for section in ["clues", "deductions"]:
		for entry in data.get(section, []):
			if entry.get("id") == id:
				return str(entry.get("text", ""))
	return ""
