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
	readout.text = "把三块记录片分别送入能产生有效读数的检具；红灯只报告测量失败，不会给出正确组合。"
	_refresh()
	return true

func close_workbench() -> void:
	visible = false
	selected_plate = ""

func _on_plate_selected(plate_id: String) -> void:
	if puzzle == null or state.investigation_state["repair_synthesis_complete"]:
		return
	selected_plate = plate_id
	readout.text = "已提起记录片：%s。选择一台检具；已装片的检具可先单击退片。" % _plate_label(plate_id)
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
		button.text = "%s%s" % [_plate_label(plate_id), "  · 已装片" if placed_slot >= 0 else ""]
		button.modulate = Color(0.62, 0.64, 0.58) if button.disabled else (Color(1.0, 0.86, 0.52) if selected_plate == plate_id else Color.WHITE)
	var station_labels: Array = config.get("station_labels", ["双印比较器", "三端导通桥", "圆筒公差规"])
	for slot_index in 3:
		var slot: Button = get_node("Bench/SlotRack/Slot%d" % slot_index)
		var plate_id: String = str(puzzle.plate_at_slot(slot_index))
		slot.disabled = complete
		slot.text = ""
		var station_readout: Label = slot.get_node("Readout")
		station_readout.text = "%s\n%s" % [str(station_labels[slot_index]), _station_readout(slot_index, plate_id)]
		var station_lamp: ColorRect = slot.get_node("StationLamp")
		var accepted := not plate_id.is_empty() and plate_id == str(RepairSynthesisPuzzle.ACCEPTED_MAPPING[slot_index])
		station_lamp.color = Color(0.22, 0.94, 0.66, 0.92) if accepted else Color(0.88, 0.2, 0.12, 0.88)
	compression_handle.disabled = complete
	compression_handle.text = ""
	$Bench/HandleCaption.text = "记录已封存" if complete else "压合联锁杆"
	$Bench/SealLamp.color = Color(0.32, 0.92, 0.68, 1.0) if complete else Color(0.9, 0.42, 0.18, 0.78)

func _slot_for_plate(plate_id: String) -> int:
	for step in state.investigation_state["repair_synthesis_steps"]:
		if str(step["plate_id"]) == plate_id:
			return int(step["slot"])
	return -1

func _plate_label(plate_id: String) -> String:
	var labels: Dictionary = config.get("plate_labels", {
		"REV3_STAMP": "R3 / 17:42 / 双压痕",
		"AC_PATH": "外侧连线 / 中端断路",
		"FUSE_SPEC": "Ø12 / 40A / F-2",
	})
	return str(labels.get(plate_id, plate_id))

func _station_readout(slot_index: int, plate_id: String) -> String:
	if plate_id.is_empty():
		return ["等待压痕读数", "等待三端读数", "等待触点读数"][slot_index]
	if plate_id == str(RepairSynthesisPuzzle.ACCEPTED_MAPPING[slot_index]):
		return ["指针越过旧印基准", "外侧导通 · 中端断路", "双触点进入绿色公差带"][slot_index]
	return ["压痕不可叠合", "连续性读数不成立", "双触点未同时闭合"][slot_index]
