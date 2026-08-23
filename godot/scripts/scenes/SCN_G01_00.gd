class_name SCNG0100
extends Node2D

var state = preload("res://scripts/core/GameState.gd").new()
var clue_service
var inventory_service

@onready var flashlight = $World/Flashlight
@onready var flashlight_pickup = $World/FlashlightPickup
@onready var status_label = $UI/StatusStrip/Status
@onready var deduction_board = $UI/DeductionBoard
@onready var inventory_text = $UI/InventoryHud/Margin/Items
@onready var cabinet_hotspot = $World/MaintenanceCabinetHotspot
@onready var cabinet_world = $World/MaintenanceCabinetWorld
@onready var fuse_pickup = $World/MaintenanceCabinetWorld/FusePickup

func _ready() -> void:
	clue_service = preload("res://scripts/clue/ClueService.gd").new(state)
	inventory_service = preload("res://scripts/inventory/InventoryService.gd").new(state)
	deduction_board.setup(state, preload("res://scripts/clue/DeductionGraph.gd").new(state))
	flashlight_pickup.input_event.connect(_on_flashlight_pickup_input)
	cabinet_hotspot.input_event.connect(_on_cabinet_input)
	fuse_pickup.input_event.connect(_on_fuse_input)
	for node in get_tree().get_nodes_in_group("inspectables"):
		node.bind_flashlight(flashlight)
		node.observed.connect(_on_clue_observed)

func _process(delta: float) -> void:
	state.elapsed_seconds += delta
	if Input.is_action_just_pressed("toggle_deduction_board") and not get_tree().paused:
		deduction_board.open_board()
	if Input.is_key_pressed(KEY_ESCAPE) and cabinet_world.visible:
		cabinet_world.visible = false

func _on_flashlight_pickup_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if inventory_service.acquire("ITM-G01-001"):
			flashlight.set_active(true)
			flashlight_pickup.visible = false
			state.scene_phase = "INVESTIGATE"
			status_label.text = "手灯已启动。光束扫过的细节可以被记录。"
			_refresh_inventory()

func _on_clue_observed(clue_id: String) -> void:
	if clue_service.observe(clue_id):
		status_label.text = "证据已记录 · %s" % clue_id
		deduction_board.refresh_cards()

func _on_cabinet_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and flashlight.active:
		cabinet_world.visible = true
		status_label.text = "维修柜内部保留了数次改装的痕迹。"

func _on_fuse_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if inventory_service.acquire("ITM-G01-002"):
			fuse_pickup.visible = false
			clue_service.observe("CLUE-005")
			status_label.text = "临时保险丝已收入设备袋，规格信息已记录。"
			_refresh_inventory()

func _refresh_inventory() -> void:
	var names: Array[String] = []
	for id in state.inventory_item_ids:
		names.append("手灯" if id == "ITM-G01-001" else "临时保险丝")
	inventory_text.text = "设备袋 · %s" % (" / ".join(names) if not names.is_empty() else "空")

