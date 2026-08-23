class_name SCNG0100
extends Node2D

var state = preload("res://scripts/core/GameState.gd").new()
var clue_service
var inventory_service
var deduction_graph
var save_service = preload("res://scripts/core/SaveService.gd").new()

@onready var flashlight = $World/Flashlight
@onready var flashlight_pickup = $World/FlashlightPickup
@onready var status_label = $UI/StatusStrip/Status
@onready var deduction_board = $UI/DeductionBoard
@onready var inventory_text = $UI/InventoryHud/Margin/Items
@onready var cabinet_hotspot = $World/MaintenanceCabinetHotspot
@onready var cabinet_world = $World/MaintenanceCabinetWorld
@onready var fuse_pickup = $World/MaintenanceCabinetWorld/FusePickup
@onready var power_panel = $World/PowerPanelWorld
@onready var blackout = $World/Blackout
@onready var restored_background = $World/RestoredBackground
@onready var echo_indicator = $World/EchoIndicator

func _ready() -> void:
	var pending = preload("res://scripts/core/SceneDirector.gd").take_pending_snapshot()
	if not pending.is_empty():
		state.restore(pending)
	clue_service = preload("res://scripts/clue/ClueService.gd").new(state)
	inventory_service = preload("res://scripts/inventory/InventoryService.gd").new(state)
	deduction_graph = preload("res://scripts/clue/DeductionGraph.gd").new(state)
	deduction_board.setup(state, deduction_graph)
	deduction_board.deduction_unlocked.connect(_on_deduction_unlocked)
	power_panel.setup(state)
	power_panel.power_restored.connect(_on_power_restored)
	power_panel.milestone_reached.connect(_on_panel_milestone)
	flashlight_pickup.input_event.connect(_on_flashlight_pickup_input)
	$World/PowerPanelHotspot.input_event.connect(_on_power_panel_input)
	cabinet_hotspot.input_event.connect(_on_cabinet_input)
	fuse_pickup.input_event.connect(_on_fuse_input)
	for node in get_tree().get_nodes_in_group("inspectables"):
		node.bind_flashlight(flashlight)
		node.observed.connect(_on_clue_observed)
	_restore_from_state()

func _process(delta: float) -> void:
	state.elapsed_seconds += delta
	if Input.is_action_just_pressed("toggle_deduction_board") and not get_tree().paused:
		if state.scene_phase == "INVESTIGATE":
			state.scene_phase = "DEDUCTION"
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
			_save()

func _on_clue_observed(clue_id: String) -> void:
	if clue_service.observe(clue_id):
		status_label.text = "证据已记录 · %s" % clue_id
		var unlocked = deduction_graph.recompute()
		for id in unlocked:
			_on_deduction_unlocked(id)
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
			_save()

func _refresh_inventory() -> void:
	var names: Array[String] = []
	for id in state.inventory_item_ids:
		names.append("手灯" if id == "ITM-G01-001" else "临时保险丝")
	inventory_text.text = "设备袋 · %s" % (" / ".join(names) if not names.is_empty() else "空")

func _on_deduction_unlocked(_id: String) -> void:
	deduction_board.refresh_cards()
	_save()

func _on_power_panel_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and "DED-004" in state.unlocked_deduction_ids:
		state.scene_phase = "REPAIR"
		power_panel.visible = true
		status_label.text = "配电箱近景 · 依据推论操作实体机构。"

func _on_panel_milestone(_name: String) -> void:
	_save()
	_refresh_inventory()

func _on_power_restored() -> void:
	state.scene_phase = "POWER_RESTORED"
	power_panel.visible = false
	blackout.visible = false
	$World/EmergencyGlow.visible = false
	restored_background.visible = true
	echo_indicator.visible = true
	state.scene_phase = "SLICE_COMPLETE"
	status_label.text = "领航舱供电恢复。船尾回波仍在更深处重复。"
	_save()

func _restore_from_state() -> void:
	flashlight.set_active("ITM-G01-001" in state.inventory_item_ids or "ITM-G01-001" in state.installed_item_ids)
	flashlight_pickup.visible = not flashlight.active
	fuse_pickup.visible = "ITM-G01-002" not in state.inventory_item_ids and "ITM-G01-002" not in state.installed_item_ids
	if state.world_state == "POWER_RESTORED":
		blackout.visible = false
		$World/EmergencyGlow.visible = false
		restored_background.visible = true
		echo_indicator.visible = true
	_refresh_inventory()
	deduction_graph.recompute()
	deduction_board.refresh_cards()

func _save() -> void:
	save_service.save_state(state)

