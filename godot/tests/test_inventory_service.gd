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
	t.truthy(not inventory.acquire_environment_only("RUNTIME-ITM-G01-SCN00-LABEL"))
	t.truthy(not ("RUNTIME-ITM-G01-SCN00-LABEL" in state.inventory_item_ids))
	t.truthy(inventory.has_method("select_item"), "inventory must support intentional world-space item use")
	t.truthy(inventory.has_method("drop_selected"), "inventory must support drag/drop target validation")
	if inventory.has_method("select_item") and inventory.has_method("drop_selected"):
		var drag_state = preload("res://scripts/core/GameState.gd").new()
		var drag_inventory = preload("res://scripts/inventory/InventoryService.gd").new(drag_state)
		drag_inventory.acquire("ITM-G01-001")
		drag_inventory.acquire("ITM-G01-002")
		t.truthy(drag_inventory.select_item("ITM-G01-002"))
		t.truthy(not drag_inventory.drop_selected("burnt-b-slot", "ITM-G01-002"))
		t.truthy("ITM-G01-002" in drag_state.inventory_item_ids, "wrong drop must return fuse safely")
		t.truthy("ITM-G01-001" in drag_state.inventory_item_ids, "wrong drop must preserve flashlight")

