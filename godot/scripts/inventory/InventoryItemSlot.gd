class_name InventoryItemSlot
extends TextureButton

signal item_armed(item_id: String)

var item_id := ""
var item_name := ""

func configure(id: String, display_name: String, item_texture: Texture2D) -> void:
	item_id = id
	item_name = display_name
	texture_normal = item_texture
	tooltip_text = "%s · 拖向现场设备，或单击后再点目标" % display_name
	ignore_texture_size = true
	stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED

func _pressed() -> void:
	item_armed.emit(item_id)

func _get_drag_data(_at_position: Vector2) -> Variant:
	if item_id.is_empty():
		return null
	var preview = TextureRect.new()
	preview.texture = texture_normal
	preview.custom_minimum_size = Vector2(92, 64)
	preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.modulate = Color(0.85, 0.95, 1.0, 0.9)
	set_drag_preview(preview)
	item_armed.emit(item_id)
	return {"kind": "inventory_item", "item_id": item_id}
