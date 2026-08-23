extends RefCounted

func run(t) -> void:
	var director = preload("res://scripts/core/SceneDirector.gd").new()
	t.truthy(director.advance_phase("INVESTIGATE"))
	t.truthy(director.advance_phase("DEDUCTION"))
	t.truthy(director.advance_phase("REPAIR"))
	t.truthy(director.advance_phase("POWER_RESTORED"))
	t.truthy(director.advance_phase("SLICE_COMPLETE"))
	t.equal(director.state.scene_phase, "SLICE_COMPLETE")
	t.equal(director.next_scene_marker(), "SCN-G01-01-TEASER")
	t.truthy(not director.advance_phase("SCN-G01-01"), "slice must not enter next gameplay scene")
	director.free()
	var skipped = preload("res://scripts/core/SceneDirector.gd").new()
	t.truthy(not skipped.advance_phase("REPAIR"), "flow cannot skip investigation and deduction")
	skipped.free()

