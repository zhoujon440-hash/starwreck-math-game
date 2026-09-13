class_name InventoryService
extends RefCounted

var state: RefCounted
var selected_item_id := ""

func _init(game_state: RefCounted) -> void:
	state = game_state

func acquire(item_id: String) -> bool:
	if item_id.is_empty() or item_id in state.inventory_item_ids or item_id in state.installed_item_ids:
		return false
	state.inventory_item_ids.append(item_id)
	return true

func acquire_environment_only(_runtime_id: String) -> bool:
	return false

func select_item(item_id: String) -> bool:
	if item_id not in state.inventory_item_ids:
		return false
	selected_item_id = item_id
	return true

func clear_selection() -> void:
	selected_item_id = ""

func drop_selected(target_id: String, accepted_item_id: String) -> bool:
	if selected_item_id.is_empty():
		return false
	var item_id = selected_item_id
	selected_item_id = ""
	return try_install(item_id, target_id, accepted_item_id)

func try_install(item_id: String, target_id: String, accepted_item_id: String) -> bool:
	if target_id != "standby-fuse-slot" or item_id != accepted_item_id:
		return false
	if item_id not in state.inventory_item_ids:
		return false
	state.inventory_item_ids.erase(item_id)
	if item_id not in state.installed_item_ids:
		state.installed_item_ids.append(item_id)
	return true

