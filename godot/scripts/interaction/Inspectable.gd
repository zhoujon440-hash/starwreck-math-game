class_name Inspectable
extends Area2D

signal observed(clue_id: String)
signal interaction_rejected(clue_id: String)

@export var clue_id := ""
@export var flashlight_required := true
var flashlight: Node = null
var hovered := false

func _ready() -> void:
	mouse_entered.connect(func(): hovered = true)
	mouse_exited.connect(func(): hovered = false)
	if has_node("Glow"):
		$Glow.modulate.a = 0.0

func _process(delta: float) -> void:
	if not has_node("Glow"):
		return
	var can_reveal = hovered and (not flashlight_required or (flashlight != null and flashlight.is_point_lit(global_position)))
	var target_alpha = 1.0 if can_reveal else 0.0
	$Glow.modulate.a = move_toward($Glow.modulate.a, target_alpha, delta * 4.5)

func _input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if flashlight_required and (flashlight == null or not flashlight.is_point_lit(global_position)):
			interaction_rejected.emit(clue_id)
			return
		observed.emit(clue_id)

func bind_flashlight(controller: Node) -> void:
	flashlight = controller

