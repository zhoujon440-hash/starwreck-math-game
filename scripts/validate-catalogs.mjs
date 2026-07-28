#!/usr/bin/env node
import { applyFixture, loadBaseline, printResult, validateCatalogs } from "./baseline-validation-lib.mjs";

const fixtureIndex = process.argv.indexOf("--fixture");
const fixture = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : null;
const result = validateCatalogs(applyFixture(loadBaseline(), fixture));
printResult("catalogs", result.issues, result.ruleCount);
process.exitCode = result.issues.length === 0 ? 0 : 1;
