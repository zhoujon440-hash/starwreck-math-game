class_name RepairSynthesisWorkbench
extends Control

signal synthesis_completed
signal state_changed
signal close_requested

const PLATE_IDS := ["REV3_STAMP", "AC_PATH", "FUSE_SPEC"]

var state: RefCounted
var puzzle: RefCounted
var config: Dictionary = {}
var selected_plate := ""

@onready var readout: Label = $Bench/Readout
@onready var compression_handle: Button = $Bench/CompressionHandle

func _ready() -> void:
	for plate_id in PLATE_IDS:
		get_node("Bench/PlateRack/%s" % plate_id).pressed.connect(_on_plate_selected.bind(plate_id))
	for slot_index in 3:
		get_node("Bench/SlotRack/Slot%d" % slot_index).pressed.connect(_on_slot_pressed.bind(slot_index))
	compression_handle.pressed.connect(_on_compression_pressed)
	$Bench/Return.pressed.connect(_on_return_pressed)

func setup(game_state: RefCounted, workbench_config: Dictionary) -> void:
	state = game_state
	config = workbench_config.duplicate(true)
	puzzle = preload("res://scripts/puzzle/RepairSynthesisPuzzle.gd").new(state)
	puzzle.synthesis_completed.connect(_on_puzzle_completed)
	_refresh()

func is_unlocked() -> bool:
	return puzzle != null and puzzle.is_unlocked()

func open_workbench() -> bool:
	if not is_unlocked():
		return false
	selected_plate = ""
	visible = true
	readout.text = "把旧记录按年代、批准路径、备用槽压合；这一步不会给出最终复电顺序。"
	_refresh()
	return true

func close_workbench() -> void:
	visible = false
	selected_plate = ""

func _on_plate_selected(plate_id: String) -> void:
	if puzzle == null or state.investigation_state["repair_synthesis_complete"]:
		return
	selected_plate = plate_id
	readout.text = "已提起铜片：%s。选择一个机械槽；已占用槽可先单击提片。" % _plate_label(plate_id)
	_refresh()

func _on_slot_pressed(slot_index: int) -> void:
	if puzzle == null:
		return
	var result: Dictionary
	if selected_plate.is_empty():
		result = puzzle.remove_plate(slot_index)
	else:
		result = puzzle.place_plate(slot_index, selected_plate)
		if result.changed:
			selected_plate = ""
	readout.text = result.feedback
	if result.changed:
		state_changed.emit()
	_refresh()

func _on_compression_pressed() -> void:
	if puzzle == null:
		return
	var result: Dictionary = puzzle.press_record()
	readout.text = result.feedback
	if result.changed:
		state_changed.emit()
	_refresh()

func _on_puzzle_completed() -> void:
	synthesis_completed.emit()

func _on_return_pressed() -> void:
	close_workbench()
	close_requested.emit()

func _refresh() -> void:
	if not is_inside_tree() or puzzle == null:
		return
	var complete := bool(state.investigation_state["repair_synthesis_complete"])
	for plate_id in PLATE_IDS:
		var button: Button = get_node("Bench/PlateRack/%s" % plate_id)
		var placed_slot := _slot_for_plate(plate_id)
		button.disabled = complete or placed_slot >= 0
		button.text = "%s%s" % [_plate_label(plate_id), "  · 已入槽" if placed_slot >= 0 else ""]
		button.modulate = Color(0.62, 0.64, 0.58) if button.disabled else (Color(1.0, 0.86, 0.52) if selected_plate == plate_id else Color.WHITE)
	var slot_labels: Array = config.get("slot_labels", ["年代", "批准路径", "备用槽"])
	for slot_index in 3:
		var slot: Button = get_node("Bench/SlotRack/Slot%d" % slot_index)
		var plate_id: String = str(puzzle.plate_at_slot(slot_index))
		slot.disabled = complete
		slot.text = "%s\n%s" % [str(slot_labels[slot_index]), "空槽 · 等待校验片" if plate_id.is_empty() else _plate_label(plate_id)]
	compression_handle.disabled = complete
	compression_handle.text = "记录已压合" if complete else "压下记录杆 / PRESS RECORD"
	$Bench/SealLamp.color = Color(0.32, 0.92, 0.68, 1.0) if complete else Color(0.9, 0.42, 0.18, 0.78)

func _slot_for_plate(plate_id: String) -> int:
	for step in state.investigation_state["repair_synthesis_steps"]:
		if str(step["plate_id"]) == plate_id:
			return int(step["slot"])
	return -1

func _plate_label(plate_id: String) -> String:
	var labels: Dictionary = config.get("plate_labels", {
		"REV3_STAMP": "Rev.3 复检戳",
		"AC_PATH": "A↔C 连续路径",
		"FUSE_SPEC": "公用保险丝规格",
	})
	return str(labels.get(plate_id, plate_id))
