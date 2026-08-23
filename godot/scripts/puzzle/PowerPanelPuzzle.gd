class_name PowerPanelPuzzle
extends Node2D

signal power_restored
signal milestone_reached(name: String)

var state: RefCounted = null
var dragging_b := false
var dragging_coupler := false

func _init(game_state: RefCounted = null) -> void:
	state = game_state

func setup(game_state: RefCounted) -> void:
	state = game_state
	_restore_visuals()

func set_b_isolated(value: bool) -> Dictionary:
	if not _gate_open():
		return _result(false, "relay_unstable")
	state.device_state["b_isolated"] = value
	if value:
		milestone_reached.emit("b_isolated")
	return _result(true, "mechanical_latch")

func install_fuse(item_id: String) -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false):
		return _result(false, "slot_reject")
	if item_id != "ITM-G01-002" or item_id not in state.inventory_item_ids:
		return _result(false, "slot_reject")
	state.inventory_item_ids.erase(item_id)
	if item_id not in state.installed_item_ids:
		state.installed_item_ids.append(item_id)
	state.device_state["fuse_installed"] = true
	milestone_reached.emit("fuse_installed")
	return _result(true, "magnetic_snap")

func set_coupler_angle(degrees: float) -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false) or not state.device_state.get("fuse_installed", false):
		return _result(false, "arc_recoil")
	if absf(degrees - 90.0) > 8.0:
		return _result(false, "detent_missed")
	state.device_state["coupler_angle"] = 90.0
	milestone_reached.emit("coupler_aligned")
	return _result(true, "detent_click")

func toggle_protector() -> Dictionary:
	if not _gate_open() or not state.device_state.get("b_isolated", false) or not state.device_state.get("fuse_installed", false) or absf(float(state.device_state.get("coupler_angle", 0.0)) - 90.0) > 8.0:
		_feedback_invalid()
		return _result(false, "protector_spring_return")
	state.device_state["protector_on"] = true
	state.world_state = "POWER_RESTORED"
	power_restored.emit()
	return _result(true, "power_latched", true)

func _gate_open() -> bool:
	return state != null and "DED-004" in state.unlocked_deduction_ids

func _result(ok: bool, feedback: String, completed := false) -> Dictionary:
	return {"ok": ok, "feedback": feedback, "completed": completed}

func _ready() -> void:
	if has_node("BIsolationLever"):
		$BIsolationLever.input_event.connect(_on_b_input)
		$StandbyFuseSlot.input_event.connect(_on_fuse_slot_input)
		$CouplerKnob.input_event.connect(_on_coupler_input)
		$ProtectorLever.input_event.connect(_on_protector_input)

func _on_b_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_b = event.pressed
		if not event.pressed:
			var isolated = $BIsolationLever.position.y > 400.0
			var result = set_b_isolated(isolated)
			$BIsolationLever.position.y = 460.0 if result.ok and isolated else 300.0
	if event is InputEventMouseMotion and dragging_b:
		$BIsolationLever.position.y = clampf($BIsolationLever.position.y + event.relative.y, 300.0, 460.0)

func _on_fuse_slot_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and state != null:
		var result = install_fuse("ITM-G01-002")
		if result.ok:
			$StandbyFuseSlot/FuseInserted.visible = true
		else:
			_feedback_invalid()

func _on_coupler_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging_coupler = event.pressed
		if not event.pressed:
			var result = set_coupler_angle(rad_to_deg($CouplerKnob.rotation))
			$CouplerKnob.rotation = deg_to_rad(90.0) if result.ok else 0.0
	if event is InputEventMouseMotion and dragging_coupler:
		$CouplerKnob.rotation = clampf($CouplerKnob.rotation + event.relative.x * 0.012, 0.0, deg_to_rad(110.0))

func _on_protector_input(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var result = toggle_protector()
		$ProtectorLever.rotation = 0.6 if result.ok else 0.0

func _feedback_invalid() -> void:
	if not has_node("StatusLamp"):
		return
	$StatusLamp.color = Color(1, 0.05, 0.02, 1)
	var tween = create_tween()
	tween.tween_property($StatusLamp, "color", Color(0.25, 0.02, 0.02, 1), 0.35)

func _restore_visuals() -> void:
	if state == null or not has_node("BIsolationLever"):
		return
	$BIsolationLever.position.y = 460.0 if state.device_state.get("b_isolated", false) else 300.0
	$StandbyFuseSlot/FuseInserted.visible = state.device_state.get("fuse_installed", false)
	$CouplerKnob.rotation = deg_to_rad(float(state.device_state.get("coupler_angle", 0.0)))
	$ProtectorLever.rotation = 0.6 if state.device_state.get("protector_on", false) else 0.0

