#!/usr/bin/env node
import { applyFixture, loadBaseline, printResult, validateStory } from "./baseline-validation-lib.mjs";

const fixtureIndex = process.argv.indexOf("--fixture");
const fixture = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : null;
const result = validateStory(applyFixture(loadBaseline(), fixture));
printResult("story-boundaries", result.issues, result.ruleCount);
process.exitCode = result.issues.length === 0 ? 0 : 1;
