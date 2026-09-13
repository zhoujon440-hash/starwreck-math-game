class_name FuseDropTarget
extends Control

signal item_dropped(item_id: String)

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	return data is Dictionary and data.get("kind") == "inventory_item"

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	item_dropped.emit(str(data.get("item_id", "")))

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN:
		modulate = Color(0.65, 0.95, 1.0, 1.0)
	elif what == NOTIFICATION_DRAG_END:
		modulate = Color.WHITE
