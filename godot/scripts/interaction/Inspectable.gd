class_name Inspectable
extends Area2D

signal observed(clue_id: String)

@export var clue_id := ""
@export var flashlight_required := true
var flashlight: Node = null

func _input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if flashlight_required and (flashlight == null or not flashlight.is_point_lit(global_position)):
			return
		observed.emit(clue_id)

func bind_flashlight(controller: Node) -> void:
	flashlight = controller

