extends RefCounted

func run(t) -> void:
	t.equal(ProjectSettings.get_setting("application/config/name"), "星骸拾荒者：十二星门")
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_width"), 1920)
	t.equal(ProjectSettings.get_setting("display/window/size/viewport_height"), 1080)
	var main_scene = load("res://scenes/main/Main.tscn")
	t.truthy(main_scene != null, "main scene must load")

