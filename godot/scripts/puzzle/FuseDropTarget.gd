class_name FuseDropTarget
extends Control

signal item_dropped(item_id: String)

const ACCEPTED_ITEM_ID := "ITM-G01-002"

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	return (
		data is Dictionary
		and data.get("kind") == "inventory_item"
		and str(data.get("item_id", "")) == ACCEPTED_ITEM_ID
	)

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if not _can_drop_data(_at_position, data):
		return
	item_dropped.emit(str(data.get("item_id", "")))

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN:
		modulate = Color(0.65, 0.95, 1.0, 1.0)
	elif what == NOTIFICATION_DRAG_END:
		modulate = Color.WHITE
