class_name RepairSynthesisPuzzle
extends RefCounted

signal synthesis_completed

const REQUIRED_CLUES := ["CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]
const REQUIRED_DEDUCTION := "DED-003"
const PLATE_IDS := ["REV3_STAMP", "AC_PATH", "FUSE_SPEC"]
const ACCEPTED_MAPPING := {0: "REV3_STAMP", 1: "AC_PATH", 2: "FUSE_SPEC"}

var state: RefCounted

func _init(game_state: RefCounted) -> void:
	state = game_state

func is_unlocked() -> bool:
	if state == null or REQUIRED_DEDUCTION not in state.unlocked_deduction_ids:
		return false
	for clue_id in REQUIRED_CLUES:
		if clue_id not in state.observed_clue_ids:
			return false
	return true

func place_plate(slot_index: int, plate_id: String) -> Dictionary:
	if not is_unlocked():
		return _result(false, false, "维修记录台仍被封条锁住：先固定 Rev.3 取代旧快修的推论，并带齐四条维修证据。", false)
	if state.investigation_state["repair_synthesis_complete"]:
		return _result(false, true, "压合记录已经封存，铜片不能再移动。", false)
	if slot_index not in ACCEPTED_MAPPING or plate_id not in PLATE_IDS:
		return _result(false, false, "这块铜片或机械槽不属于当前 Rev.3 记录台。", false)
	var steps: Array = state.investigation_state["repair_synthesis_steps"]
	for step in steps:
		if int(step["slot"]) == slot_index:
			return _result(false, false, "机械槽已有铜片；先提起原片，再放入新的证据片。", false)
		if str(step["plate_id"]) == plate_id:
			return _result(false, false, "同一块实体铜片已经卡在另一条记录槽中。", false)
	steps.append({"slot": slot_index, "plate_id": plate_id})
	return _result(true, false, _placement_feedback(slot_index, plate_id), true)

func remove_plate(slot_index: int) -> Dictionary:
	if state == null or slot_index not in ACCEPTED_MAPPING:
		return _result(false, false, "没有可操作的机械槽。", false)
	if not is_unlocked():
		return _result(false, false, "维修记录台仍被封条锁住，当前槽位保持原样。", false)
	if state.investigation_state["repair_synthesis_complete"]:
		return _result(false, true, "压合记录已经封存，铜片不能再移除。", false)
	var steps: Array = state.investigation_state["repair_synthesis_steps"]
	for index in steps.size():
		if int(steps[index]["slot"]) == slot_index:
			steps.remove_at(index)
			return _result(true, false, "铜片已提起；其它已核对的槽位保持不动。", true)
	return _result(false, false, "该槽位仍是空的。", false)

func press_record() -> Dictionary:
	if not is_unlocked():
		return _result(false, false, "压合杆保持锁定：维修证据与 Rev.3 取代关系尚未齐全。", false)
	if state.investigation_state["repair_synthesis_complete"]:
		return _result(true, true, "三枚校验片已经压合成正式维修记录。", false)
	var steps: Array = state.investigation_state["repair_synthesis_steps"]
	if steps.size() != ACCEPTED_MAPPING.size():
		return _result(false, false, "压合杆没有吃合：年代、批准路径、备用槽三项记录仍未放齐。", false)
	for slot_index in ACCEPTED_MAPPING:
		var plate_id := _plate_at_slot(int(slot_index))
		if plate_id != str(ACCEPTED_MAPPING[slot_index]):
			return _result(false, false, _placement_feedback(int(slot_index), plate_id), false)
	state.investigation_state["repair_synthesis_complete"] = true
	synthesis_completed.emit()
	return _result(true, true, "压合完成：三项旧记录已合成一份可追溯的 Rev.3 维修记录。", true)

func plate_at_slot(slot_index: int) -> String:
	return _plate_at_slot(slot_index)

func _plate_at_slot(slot_index: int) -> String:
	if state == null:
		return ""
	for step in state.investigation_state["repair_synthesis_steps"]:
		if int(step["slot"]) == slot_index:
			return str(step["plate_id"])
	return ""

func _placement_feedback(slot_index: int, plate_id: String) -> String:
	if plate_id == str(ACCEPTED_MAPPING.get(slot_index, "")):
		return [
			"年代槽咬合：后压 Rev.3 复检戳晚于星宇的旧手写标签。",
			"批准路径槽咬合：铭牌的 A↔C 连续刻槽绕开受损 B 支路。",
			"备用槽咬合：焊花姐的公用保险丝规格与 Rev.3 备用槽匹配。",
		][slot_index]
	return [
		"年代槽保留了当前铜片，但它不能证明版本先后；只有后压 Rev.3 复检戳能与旧标签比较年代。",
		"批准路径槽保留了当前铜片，但这里必须沿 Rev.3 铭牌核对备用 A↔C 连通，规格或年代不能代替路径。",
		"备用槽保留了当前铜片，但这里要核对焊花姐公用保险丝的适配规格，版本戳或路径不能证明槽位匹配。",
	][slot_index]

func _result(ok: bool, completed: bool, feedback: String, changed: bool) -> Dictionary:
	return {"ok": ok, "completed": completed, "feedback": feedback, "changed": changed}
