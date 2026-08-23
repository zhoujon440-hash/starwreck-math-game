class_name FlashlightController
extends PointLight2D

@export var follow_speed := 12.0
@export var inspection_radius := 230.0
var active := false

func _ready() -> void:
	enabled = active

func _process(delta: float) -> void:
	if not active:
		return
	global_position = global_position.lerp(get_global_mouse_position(), clampf(delta * follow_speed, 0.0, 1.0))

func set_active(value: bool) -> void:
	active = value
	enabled = value

func is_point_lit(world_position: Vector2) -> bool:
	return active and global_position.distance_to(world_position) <= inspection_radius

