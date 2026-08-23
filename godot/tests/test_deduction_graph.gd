extends RefCounted

func run(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	var clues = preload("res://scripts/clue/ClueService.gd").new(state)
	t.truthy(clues.observe("CLUE-001"))
	t.truthy(not clues.observe("CLUE-001"), "clues must deduplicate")
	for id in ["CLUE-002", "CLUE-003", "CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		clues.observe(id)
	var graph = preload("res://scripts/clue/DeductionGraph.gd").new(state)
	graph.recompute()
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
	t.truthy(graph.has_deduction("DED-004"))
	var unknown = graph.add_edge("CLUE-999", "CLUE-001", "supports")
	t.truthy(not unknown.accepted)

