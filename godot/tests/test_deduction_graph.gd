extends RefCounted

func run(t) -> void:
	var board = preload("res://scripts/clue/DeductionBoard.gd").new()
	var rejected_reads := [
		board._rejected_reason("CLUE-002", "CLUE-003", "contradicts"),
		board._rejected_reason("CLUE-002", "CLUE-003", "supersedes"),
		board._rejected_reason("CLUE-006", "CLUE-005", "supports"),
		board._rejected_reason("CLUE-006", "CLUE-005", "contradicts"),
		board._rejected_reason("DED-002", "CLUE-004", "contradicts"),
		board._rejected_reason("CLUE-004", "CLUE-005", "supersedes"),
	]
	for feedback in rejected_reads:
		t.truthy(str(feedback).length() >= 55, "evidence-grounded wrong relations need a readable comparison, not generic rejection")
	var unique_reads: Array = []
	for feedback in rejected_reads:
		if feedback not in unique_reads:
			unique_reads.append(feedback)
	t.equal(unique_reads.size(), rejected_reads.size(), "different wrong relations need distinct reasoning feedback")
	board.free()
	var state = preload("res://scripts/core/GameState.gd").new()
	var clues = preload("res://scripts/clue/ClueService.gd").new(state)
	t.truthy(clues.observe("CLUE-001"))
	t.truthy(not clues.observe("CLUE-001"), "clues must deduplicate")
	for id in ["CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		clues.observe(id)
	var graph = preload("res://scripts/clue/DeductionGraph.gd").new(state)
	graph.recompute()
	t.truthy(not graph.has_deduction("DED-001"), "recording a clue must not silently perform the player's first inference")
	t.truthy(graph.has_method("analyze_clue"), "single-clue inference needs an intentional analyze action")
	if graph.has_method("analyze_clue"):
		var analyzed = graph.call("analyze_clue", "CLUE-001")
		t.truthy(analyzed.accepted)
		t.truthy(graph.has_deduction("DED-001"))
	t.truthy(graph.add_edge("CLUE-002", "CLUE-003", "supports").accepted)
	t.truthy(graph.has_deduction("DED-002"))
	var edge_count = state.deduction_edges.size()
	t.truthy(graph.add_edge("CLUE-002", "CLUE-003", "supports").accepted)
	t.equal(state.deduction_edges.size(), edge_count, "duplicate edge must be idempotent")
	t.truthy(graph.add_edge("CLUE-007", "CLUE-006", "supersedes").accepted)
	t.truthy(graph.has_deduction("DED-003"))
	var bad = graph.add_edge("CLUE-006", "CLUE-007", "supports")
	t.truthy(not bad.accepted)
	t.equal(state.deduction_edges.size(), edge_count + 1, "rejected edge must not persist")
	var conclusion_bridge = graph.add_edge("DED-002", "CLUE-004", "supports")
	t.truthy(conclusion_bridge.accepted, "unlocked deductions must be reusable as evidence inputs")
	t.truthy(not graph.has_deduction("DED-004"), "the final principle needs a third deliberate evidence relation")
	var synthesis = graph.add_edge("CLUE-004", "CLUE-005", "supports")
	t.truthy(synthesis.accepted, "plate constraint and fuse specification must form the final synthesis")
	t.truthy(not graph.has_deduction("DED-004"), "relation edges alone cannot bypass the physical repair-record synthesis")
	state.investigation_state["repair_synthesis_steps"] = [
		{"slot": 0, "plate_id": "REV3_STAMP"},
		{"slot": 1, "plate_id": "AC_PATH"},
		{"slot": 2, "plate_id": "FUSE_SPEC"},
	]
	state.investigation_state["repair_synthesis_complete"] = true
	t.truthy("DED-004" in graph.recompute(), "completed synthesis releases DED-004 when every relation is already present")
	t.truthy(graph.has_deduction("DED-004"))

	var edges_missing_state = preload("res://scripts/core/GameState.gd").new()
	edges_missing_state.observed_clue_ids.assign(["CLUE-001", "CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"])
	var edges_missing_graph = preload("res://scripts/clue/DeductionGraph.gd").new(edges_missing_state)
	edges_missing_graph.analyze_clue("CLUE-001")
	edges_missing_graph.add_edge("CLUE-002", "CLUE-003", "supports")
	edges_missing_graph.add_edge("CLUE-007", "CLUE-006", "supersedes")
	edges_missing_state.investigation_state["repair_synthesis_steps"] = [
		{"slot": 0, "plate_id": "REV3_STAMP"},
		{"slot": 1, "plate_id": "AC_PATH"},
		{"slot": 2, "plate_id": "FUSE_SPEC"},
	]
	edges_missing_state.investigation_state["repair_synthesis_complete"] = true
	edges_missing_graph.recompute()
	t.truthy(not edges_missing_graph.has_deduction("DED-004"), "correct synthesis alone cannot bypass the two required conclusion relations")
	var unknown = graph.add_edge("CLUE-999", "CLUE-001", "supports")
	t.truthy(not unknown.accepted)
