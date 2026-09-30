class_name InventoryHud
extends Control

signal item_armed(item_id: String)

var state: RefCounted
var inventory_service: RefCounted
var item_data: Dictionary = {}
var slots: Dictionary = {}

@onready var item_slots: HBoxContainer = $Margin/ItemSlots
@onready var empty_label: Label = $Empty

func _ready() -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if parsed is Dictionary:
		for item in parsed.get("items", []):
			item_data[str(item.get("id"))] = item

func setup(game_state: RefCounted, service: RefCounted) -> void:
	state = game_state
	inventory_service = service
	refresh()

func refresh() -> void:
	if state == null or not is_node_ready():
		return
	for child in item_slots.get_children():
		child.queue_free()
	slots.clear()
	for item_id in state.inventory_item_ids:
		_create_slot(item_id)
	empty_label.visible = state.inventory_item_ids.is_empty()

func set_selected(item_id: String) -> void:
	for id in slots:
		var slot: TextureButton = slots[id]
		slot.modulate = Color(0.55, 0.95, 1.0) if id == item_id else Color.WHITE

func _create_slot(item_id: String) -> void:
	var entry: Dictionary = item_data.get(item_id, {})
	var slot = preload("res://scripts/inventory/InventoryItemSlot.gd").new()
	slot.custom_minimum_size = Vector2(112, 70)
	var texture_path = str(entry.get("asset", ""))
	var texture = load(texture_path) if not texture_path.is_empty() else null
	slot.configure(item_id, str(entry.get("name", item_id)), texture)
	slot.item_armed.connect(_on_item_armed)
	item_slots.add_child(slot)
	slots[item_id] = slot

func _on_item_armed(item_id: String) -> void:
	if inventory_service != null and inventory_service.select_item(item_id):
		set_selected(item_id)
		item_armed.emit(item_id)
