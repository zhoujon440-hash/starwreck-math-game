extends Control

# A live instrument face. The lock puzzle reads state separately: this display
# makes amplitude and phase observable before the player attempts a lock.
var gain := 0
var reference_gain := 3
var phase_tick := 0
var reference_tick := 11
var weak_channel := false

func configure(current_gain: int, target_gain: int, current_phase: int, target_phase: int, is_weak: bool) -> void:
	gain = current_gain
	reference_gain = target_gain
	phase_tick = current_phase
	reference_tick = target_phase
	weak_channel = is_weak
	queue_redraw()

func _amplitude() -> float:
	return 30.0 * float(gain + 1) / float(reference_gain + 1)

func signal_points() -> PackedVector2Array:
	var profile := [0.0, 0.06, 0.02, 0.45, 0.12, 0.75, 0.25, 1.0, 0.15, 0.04, 0.0]
	var points := PackedVector2Array()
	for index in profile.size():
		points.append(Vector2(12.0 + float(index) * (size.x - 24.0) / float(profile.size() - 1), 48.0 - float(profile[index]) * _amplitude()))
	return points

func peak_in_reference_band() -> bool:
	var peak_y := 48.0 - _amplitude()
	return peak_y >= 16.0 and peak_y <= 20.0

func phase_marker_x() -> float:
	return _tick_x(phase_tick)

func reference_marker_x() -> float:
	return _tick_x(reference_tick)

func _tick_x(tick: int) -> float:
	return 12.0 + (float(tick) + 0.5) * (size.x - 24.0) / 12.0

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.004, 0.018, 0.024, 1.0))
	for column in range(1, 12):
		var x := 12.0 + float(column) * (size.x - 24.0) / 12.0
		draw_line(Vector2(x, 6), Vector2(x, 54), Color(0.12, 0.3, 0.31, 0.55))
	draw_rect(Rect2(12, 16, size.x - 24, 4), Color(0.15, 0.85, 0.6, 0.35))
	draw_line(Vector2(12, 16), Vector2(size.x - 12, 16), Color(0.28, 0.9, 0.67), 1.0)
	draw_line(Vector2(12, 20), Vector2(size.x - 12, 20), Color(0.28, 0.9, 0.67), 1.0)
	var trace_color := Color(1.0, 0.66, 0.32) if weak_channel else Color(0.42, 1.0, 0.9)
	draw_polyline(signal_points(), trace_color, 2.5, true)
	if weak_channel:
		draw_line(Vector2(12, 66), Vector2(size.x - 12, 66), Color(0.3, 0.5, 0.52), 1.0)
		for tick in 12:
			draw_line(Vector2(_tick_x(tick), 62), Vector2(_tick_x(tick), 70), Color(0.5, 0.65, 0.67), 1.0)
		var reference_x := reference_marker_x()
		draw_rect(Rect2(reference_x - 8, 59, 16, 14), Color(0.72, 0.96, 0.9), false, 2.0)
		var marker_x := phase_marker_x()
		draw_colored_polygon(PackedVector2Array([Vector2(marker_x, 60), Vector2(marker_x - 6, 53), Vector2(marker_x + 6, 53)]), trace_color)
