class_name InventoryService
extends RefCounted

var state: RefCounted

func _init(game_state: RefCounted) -> void:
	state = game_state

func acquire(item_id: String) -> bool:
	if item_id.is_empty() or item_id in state.inventory_item_ids or item_id in state.installed_item_ids:
		return false
	state.inventory_item_ids.append(item_id)
	return true

func acquire_environment_only(_runtime_id: String) -> bool:
	return false

func try_install(item_id: String, target_id: String, accepted_item_id: String) -> bool:
	if target_id != "standby-fuse-slot" or item_id != accepted_item_id:
		return false
	if item_id not in state.inventory_item_ids:
		return false
	state.inventory_item_ids.erase(item_id)
	if item_id not in state.installed_item_ids:
		state.installed_item_ids.append(item_id)
	return true

