class_name SCNG0100
extends Node2D

var state = preload("res://scripts/core/GameState.gd").new()
var clue_service
var inventory_service

@onready var flashlight = $World/Flashlight
@onready var flashlight_pickup = $World/FlashlightPickup
@onready var status_label = $UI/StatusStrip/Status

func _ready() -> void:
	clue_service = preload("res://scripts/clue/ClueService.gd").new(state)
	inventory_service = preload("res://scripts/inventory/InventoryService.gd").new(state)
	flashlight_pickup.input_event.connect(_on_flashlight_pickup_input)
	for node in get_tree().get_nodes_in_group("inspectables"):
		node.bind_flashlight(flashlight)
		node.observed.connect(_on_clue_observed)

func _process(delta: float) -> void:
	state.elapsed_seconds += delta

func _on_flashlight_pickup_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if inventory_service.acquire("ITM-G01-001"):
			flashlight.set_active(true)
			flashlight_pickup.visible = false
			state.scene_phase = "INVESTIGATE"
			status_label.text = "手灯已启动。光束扫过的细节可以被记录。"

func _on_clue_observed(clue_id: String) -> void:
	if clue_service.observe(clue_id):
		status_label.text = "证据已记录 · %s" % clue_id

