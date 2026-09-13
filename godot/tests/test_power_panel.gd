extends RefCounted

func run(t) -> void:
	var locked_state = preload("res://scripts/core/GameState.gd").new()
	locked_state.inventory_item_ids.append("ITM-G01-002")
	var locked = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(locked_state)
	t.truthy(not locked.set_b_isolated(true).ok)
	t.truthy(not locked.toggle_protector().ok)
	t.equal(locked_state.world_state, "BLACKOUT", "observing the device before reasoning must never complete it")
	t.truthy("DED-004" not in locked_state.unlocked_deduction_ids)
	t.truthy("ITM-G01-002" in locked_state.inventory_item_ids)
	locked.free()

	var state = preload("res://scripts/core/GameState.gd").new()
	state.unlocked_deduction_ids.append("DED-004")
	state.inventory_item_ids.append("ITM-G01-002")
	var puzzle = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(state)
	t.truthy(not puzzle.toggle_protector().ok)
	t.truthy(not puzzle.install_fuse("WRONG").ok)
	t.truthy("ITM-G01-002" in state.inventory_item_ids)
	t.truthy(puzzle.set_b_isolated(true).ok)
	var diagnostic_gate = puzzle.install_fuse("ITM-G01-002")
	t.truthy(not diagnostic_gate.ok, "fuse must remain physically blocked until the signal diagnostic is complete")
	t.equal(diagnostic_gate.feedback, "DIAGNOSTIC_REQUIRED", "the fuse slot must identify the local diagnostic interlock")
	t.truthy("ITM-G01-002" in state.inventory_item_ids, "diagnostic rejection must not consume the critical fuse")
	t.truthy(not puzzle.set_coupler_angle(90.0).ok, "coupler must recoil until a fuse is seated")
	t.truthy(state.device_state["b_isolated"], "wrong operation must preserve correct partial progress")
	state.math_state["window_locked"] = true
	t.truthy(puzzle.install_fuse("ITM-G01-002").ok)
	t.truthy(puzzle.set_coupler_angle(90.0).ok)
	var result = puzzle.toggle_protector()
	t.truthy(result.ok)
	t.truthy(result.completed)
	t.equal(state.world_state, "POWER_RESTORED")
	puzzle.free()
	var packed = load("res://scenes/g01/PowerPanelCloseup.tscn")
	t.truthy(packed != null)
	if packed != null:
		var panel = packed.instantiate()
		for path in ["PanelShadow", "PanelFrame", "PanelFrame/BoltTL", "MetalWear", "ModuleBackplates", "BranchBus", "BIsolationLever", "BIsolationLever/LabelPlate", "StandbyFuseSlot", "StandbyFuseSlot/LabelPlate", "StandbyFuseSlot/ContactTop", "StandbyFuseSlot/DropTarget", "CouplerKnob", "CouplerKnob/LabelPlate", "CouplerKnob/DetentTicks", "ProtectorLever", "ProtectorLever/LabelPlate", "ProtectorLever/GuardRail", "WarningLamp", "StatusLamp", "FeedbackArc", "Close"]:
			t.truthy(panel.has_node(path), "power panel is missing required physical layer: %s" % path)
		t.equal(panel.get_node("StandbyFuseSlot/DropTarget").mouse_filter, Control.MOUSE_FILTER_PASS, "drag target must pass click-to-arm input through to the physical slot")
		var aligned_state = preload("res://scripts/core/GameState.gd").new()
		aligned_state.unlocked_deduction_ids.append("DED-004")
		aligned_state.device_state["b_isolated"] = true
		aligned_state.device_state["fuse_installed"] = true
		aligned_state.device_state["coupler_angle"] = 90.0
		panel.setup(aligned_state)
		panel.get_node("DeviceAudio").free()
		panel.coupler_preview_angle = deg_to_rad(42.0)
		panel.get_node("CouplerKnob/Dial").rotation = panel.coupler_preview_angle
		panel.get_node("CouplerKnob/Needle").rotation = panel.coupler_preview_angle
		var release = InputEventMouseButton.new()
		release.button_index = MOUSE_BUTTON_LEFT
		release.pressed = false
		panel._on_coupler_input(null, release, 0)
		t.equal(aligned_state.device_state.get("coupler_angle"), 90.0, "rejected re-drag must preserve the latched coupler state")
		t.truthy(is_equal_approx(panel.get_node("CouplerKnob/Dial").rotation, deg_to_rad(90.0)), "rejected re-drag must return the dial to its saved angle")
		t.truthy(is_equal_approx(panel.get_node("CouplerKnob/Needle").rotation, deg_to_rad(90.0)), "rejected re-drag must return the needle to its saved angle")
		panel.free()

	var console_packed = load("res://scenes/g01/SignalWindowConsole.tscn")
	t.truthy(console_packed != null, "world-native signal-window console scene must exist")
	if console_packed != null:
		var console = console_packed.instantiate()
		var required_controls := [
			"ProbeWrench", "ProbeGloves",
			"OriginWheel/Marker", "OriginWheel/LockPin",
			"EchoCaliper/PulseJaw", "EchoCaliper/EchoJaw", "EchoCaliper/MeasureLever",
			"BlockadeOverlay/Clamp", "Window0", "Window1", "Window2", "LockLever",
			"Readout", "HintGlow", "GuidedTrend", "SignedRelation", "EtchedEvidence", "ReturnButton",
		]
		for tick in 12:
			required_controls.append("BlockadeOverlay/Slot%02d" % tick)
		for path in required_controls:
			t.truthy(console.has_node(path), "signal-window console is missing physical control: %s" % path)
		for window_index in 3:
			for etched_mark in ["Mark0", "Mark3", "Mark6", "Mark9"]:
				t.truthy(console.has_node("Window%d/AbsoluteFrame/%s" % [window_index, etched_mark]), "shutter ring needs an etched absolute phase frame")
		var physical_controls := [
			"ProbeWrench", "ProbeGloves", "OriginWheel/Marker", "OriginWheel/LockPin",
			"EchoCaliper/PulseJaw", "EchoCaliper/EchoJaw", "EchoCaliper/MeasureLever",
			"BlockadeOverlay/Clamp", "Window0", "Window1", "Window2", "LockLever",
		]
		for tick in 12:
			physical_controls.append("BlockadeOverlay/Slot%02d" % tick)
		for physical_path in physical_controls:
			t.truthy(console.get_node(physical_path) is Area2D, "diagnostic interaction must remain a physical world control: %s" % physical_path)
		t.truthy(console.find_children("*", "LineEdit", true, false).is_empty(), "diagnostic must not expose number entry")
		var console_source := FileAccess.get_file_as_string("res://scenes/g01/SignalWindowConsole.tscn")
		for forbidden_copy in ["提交", "答案", "得分", "ABCD", "SUBMIT", "SCORE"]:
			t.truthy(forbidden_copy not in console_source, "diagnostic must avoid classroom or generic quiz copy")
		var diagnostic_state = preload("res://scripts/core/GameState.gd").new()
		diagnostic_state.unlocked_deduction_ids.append("DED-004")
		diagnostic_state.device_state["b_isolated"] = true
		diagnostic_state.inventory_item_ids.append("ITM-G01-003")
		var diagnostic_inventory = preload("res://scripts/inventory/InventoryService.gd").new(diagnostic_state)
		var diagnostic_config = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00_math.json"))
		console.setup(diagnostic_state, diagnostic_inventory, diagnostic_config)
		t.truthy(not console.get_node("OriginWheel/Marker").input_pickable, "measurement wheel waits for both physical probe tools")
		t.truthy(not console.get_node("EchoCaliper/PulseJaw").visible and not console.get_node("BlockadeOverlay/Slot00").visible, "later instruments stay hidden before their stage")
		t.equal(console.activate_probe_tool("wrench").feedback, "PROBE_TOOL_SEATED")
		t.equal(console.activate_probe_tool("gloves").feedback, "PROBE_UNSAFE", "missing gloves keep the probe mechanically open")
		t.truthy(not diagnostic_state.math_state["probe_prepared"])
		diagnostic_state.inventory_item_ids.append("ITM-G01-004")
		t.equal(console.activate_probe_tool("gloves").feedback, "PROBE_PREPARED")
		t.truthy(diagnostic_state.math_state["probe_prepared"], "both cabinet tools prepare the probe without a generic form")
		t.truthy(console.get_node("OriginWheel/Marker").input_pickable and console.get_node("OriginWheel/LockPin").input_pickable, "prepared probe grants origin-wheel ownership")
		console.adjust_origin(1)
		t.equal(console.confirm_origin().feedback, "ORIGIN_MISMATCH")
		console.adjust_origin(-1)
		t.equal(console.confirm_origin().feedback, "ORIGIN_CONFIRMED")
		t.equal(diagnostic_state.math_state["observed_cycles"], 1, "origin lock records the first measured cycle once")
		t.truthy(not console.get_node("OriginWheel/Marker").input_pickable and console.get_node("EchoCaliper/PulseJaw").input_pickable, "confirmed origin becomes read-only while the caliper owns input")
		t.truthy(console.get_node("EtchedEvidence").text.contains("ORIGIN 0"), "confirmed origin remains etched on the instrument")
		console.adjust_echo_jaw("pulse", 1)
		console.adjust_echo_jaw("pulse", 1)
		for _step in 5:
			console.adjust_echo_jaw("echo", 1)
		t.equal(console.confirm_echo().feedback, "ECHO_MEASUREMENT_CONFIRMED")
		t.equal(diagnostic_state.math_state["echo_measurement"], {"pulse": 6, "echo": 5, "confirmed": true})
		t.equal(diagnostic_state.math_state["observed_cycles"], 2, "caliper lever records the second measured cycle once")
		t.truthy(console.get_node("SignedRelation").text.contains("−1"), "standard support keeps the signed physical relation visible")
		t.truthy(console.get_node("BlockadeOverlay/Slot00").input_pickable, "confirmed caliper passes ownership to the overlay")
		for tick in [0, 3, 7, 8]:
			console.toggle_blockade_slot(tick)
		t.equal(console.confirm_blockade().feedback, "BLOCKADE_OVERLAY_CONFIRMED")
		t.equal(diagnostic_state.math_state["measurement_stage"], "windows")
		t.equal(diagnostic_state.math_state["observed_cycles"], 3, "overlay clamp records the third measured cycle once")
		t.truthy(not console.get_node("BlockadeOverlay/Slot00").input_pickable and console.get_node("Window0").input_pickable, "clamped overlay becomes read-only and grants ownership to the rings")
		var resumed_console = console_packed.instantiate()
		resumed_console.setup(diagnostic_state, diagnostic_inventory, diagnostic_config)
		t.equal(resumed_console.get_node("EtchedEvidence").text, console.get_node("EtchedEvidence").text, "console resume reconstructs all prior physical evidence marks")
		t.truthy(resumed_console.get_node("Window0").input_pickable and not resumed_console.get_node("BlockadeOverlay/Slot00").input_pickable, "console resume restores exact windows-stage ownership")
		resumed_console.free()
		t.equal(console.advance_window(0).feedback, "WINDOW_SET")
		t.equal(diagnostic_state.math_state["sample_windows"][0], 1, "one shutter interaction moves exactly one physical stop")
		for _step in 5:
			console.advance_window(1)
		for _step in 9:
			console.advance_window(2)
		t.equal(diagnostic_state.math_state["sample_windows"], [1, 5, 9])
		var completed_signals := [0]
		console.diagnostic_completed.connect(func(): completed_signals[0] += 1)
		t.equal(console.engage_lock().feedback, "DIAGNOSTIC_COMPLETE")
		t.truthy(diagnostic_state.math_state["window_locked"], "physical lock completes the pre-fuse diagnostic")
		t.truthy(not diagnostic_state.math_state["completed"] and not diagnostic_state.math_state["signal_split"] and not diagnostic_state.math_state["signal_verification"]["sealed"], "locking all three derived shutters leaves terminal completion exclusively to the later dual-record seal")
		t.equal(completed_signals[0], 1, "diagnostic completion emits once")
		t.truthy(not console.get_node("Readout").text.contains("1,5,9"), "the local readout must never reveal the target")
		console.free()

		var guided_state = preload("res://scripts/core/GameState.gd").new()
		guided_state.math_state["support_tier"] = "guided"
		var guided_console = console_packed.instantiate()
		guided_console.setup(guided_state, null, diagnostic_config)
		t.truthy(guided_console.get_node("HintGlow").visible and guided_console.get_node("GuidedTrend").visible, "guided presentation adds a trend without revealing all targets")
		t.equal(guided_console.puzzle.expected_windows(), [1, 5, 9], "guided presentation keeps the derived target unchanged")
		guided_console.free()

		var expert_state = preload("res://scripts/core/GameState.gd").new()
		expert_state.math_state["support_tier"] = "expert"
		var expert_console = console_packed.instantiate()
		expert_console.setup(expert_state, null, diagnostic_config)
		t.truthy(not expert_console.get_node("HintGlow").visible and not expert_console.get_node("GuidedTrend").visible, "expert presentation removes optional highlighting")
		t.truthy(expert_console.get_node("EtchedEvidence").visible, "expert presentation retains readable etched evidence")
		t.truthy(not expert_console.get_node("Window0/Position").visible, "expert presentation relies on physical detents instead of numeric readouts")
		t.equal(expert_console.puzzle.expected_windows(), [1, 5, 9], "expert presentation keeps the derived target unchanged")
		expert_console.free()
