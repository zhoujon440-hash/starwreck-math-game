extends RefCounted

var failures: Array[String] = []

func equal(actual: Variant, expected: Variant, message := "") -> void:
	if actual != expected:
		failures.append(message if message != "" else "expected %s, got %s" % [expected, actual])

func truthy(value: Variant, message := "") -> void:
	if not value:
		failures.append(message if message != "" else "expected truthy")

