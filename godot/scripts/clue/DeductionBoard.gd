class_name DeductionBoard
extends Control

signal deduction_unlocked(id: String)

var state: RefCounted
var graph: RefCounted
var cards := {}
var selected_from := ""
var selected_to := ""
var dragging_card: Control = null
var drag_offset := Vector2.ZERO

@onready var board_canvas: Control = $BoardCanvas
@onready var observed_list: VBoxContainer = $ObservedClues
@onready var selector: HBoxContainer = $RelationSelector

func _ready() -> void:
	for button in selector.get_children():
		button.pressed.connect(_on_relation_selected.bind(button.name.to_lower()))
	$Close.pressed.connect(close_board)

func setup(game_state: RefCounted, deduction_graph: RefCounted) -> void:
	state = game_state
	graph = deduction_graph

func open_board() -> void:
	visible = true
	process_mode = Node.PROCESS_MODE_WHEN_PAUSED
	refresh_cards()
	get_tree().paused = true

func close_board() -> void:
	visible = false
	selector.visible = false
	get_tree().paused = false
	process_mode = Node.PROCESS_MODE_INHERIT

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
		label.text = id
		observed_list.add_child(label)
	queue_redraw()

func _create_card(id: String) -> void:
	var card = Button.new()
	card.name = id
	card.text = "%s\n%s" % [id, _title_for(id)]
	card.custom_minimum_size = Vector2(260, 110)
	card.position = Vector2(260 + (cards.size() % 3) * 310, 150 + (cards.size() / 3) * 155)
	card.gui_input.connect(_on_card_gui_input.bind(card, id))
	board_canvas.add_child(card)
	cards[id] = card

func _on_card_gui_input(event: InputEvent, card: Control, id: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			dragging_card = card
			drag_offset = card.get_local_mouse_position()
		else:
			dragging_card = null
	if event is InputEventMouseMotion and dragging_card == card:
		card.position = (card.position + event.relative).clamp(Vector2(180, 90), Vector2(size.x - 300, size.y - 150))
		queue_redraw()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
		if selected_from.is_empty():
			selected_from = id
		else:
			selected_to = id
			selector.position = card.position + Vector2(0, 118)
			selector.visible = true

func _on_relation_selected(relation: String) -> void:
	if graph == null or selected_from.is_empty() or selected_to.is_empty():
		return
	var result = graph.add_edge(selected_from, selected_to, relation)
	if result.accepted:
		for id in result.new_deductions:
			deduction_unlocked.emit(id)
		refresh_cards()
	else:
		modulate = Color(1.0, 0.65, 0.65)
		var tween = create_tween()
		tween.tween_property(self, "modulate", Color.WHITE, 0.24)
	selected_from = ""
	selected_to = ""
	selector.visible = false
	queue_redraw()

func _draw() -> void:
	if state == null:
		return
	for edge in state.deduction_edges:
		var from_card = cards.get(edge.get("from"))
		var to_card = cards.get(edge.get("to"))
		if from_card != null and to_card != null:
			draw_line(from_card.position + from_card.size * 0.5, to_card.position + to_card.size * 0.5, Color(0.25, 0.85, 0.95, 0.9), 4.0, true)

func _title_for(id: String) -> String:
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if data is Dictionary:
		for section in ["clues", "deductions"]:
			for entry in data.get(section, []):
				if entry.get("id") == id:
					return str(entry.get("title", entry.get("text", "")))
	return id

