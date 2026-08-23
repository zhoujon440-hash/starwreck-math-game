extends RefCounted

func run(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	var inventory = preload("res://scripts/inventory/InventoryService.gd").new(state)
	t.truthy(inventory.acquire("ITM-G01-002"))
	t.truthy(not inventory.acquire("ITM-G01-002"), "duplicate pickup must be idempotent")
	t.truthy(not inventory.try_install("ITM-G01-002", "wrong-slot", "OTHER"))
	t.truthy("ITM-G01-002" in state.inventory_item_ids, "wrong use must not consume fuse")
	t.truthy(inventory.try_install("ITM-G01-002", "standby-fuse-slot", "ITM-G01-002"))
	t.truthy(not ("ITM-G01-002" in state.inventory_item_ids))
	t.truthy("ITM-G01-002" in state.installed_item_ids)

