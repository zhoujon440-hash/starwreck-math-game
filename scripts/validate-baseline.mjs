#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyFixture,
  loadBaseline,
  printResult,
  runAll,
  validateCatalogs,
  validateForbiddenTerms,
  validateSchemasAndHopa,
  validateSourceLayer,
  validateStory,
} from "./baseline-validation-lib.mjs";
import {
  validateExpandedForbidden,
  validateStarCoreContracts,
  validateStrictCatalogSources,
  validateStrictHopa,
} from "./baseline-strict-validation.mjs";

const fixtureIndex = process.argv.indexOf("--fixture");
const fixture = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : null;
const snapshot = applyFixture(loadBaseline(), fixture);
let result;
if (!fixture) {
  result = runAll(snapshot);
} else {
  const expectedRule = JSON.parse(readFileSync(resolve(fixture), "utf8")).expected_rule;
  const validators = expectedRule.startsWith("SOURCE-")
    ? [validateSourceLayer]
    : expectedRule.startsWith("CAT-")
      ? [validateCatalogs, validateStrictCatalogSources]
      : expectedRule.startsWith("STORY-")
        ? [validateStory, validateStarCoreContracts]
        : expectedRule.startsWith("HOPA-")
          ? [validateSchemasAndHopa, validateStrictHopa]
          : [validateForbiddenTerms, validateExpandedForbidden];
  const sections = validators.map((validator) => validator(snapshot));
  result = {
    issues: sections.flatMap((section) => section.issues),
    ruleCount: sections.reduce((sum, section) => sum + section.ruleCount, 0),
  };
}
printResult("baseline", result.issues, result.ruleCount);
process.exitCode = result.issues.length === 0 ? 0 : 1;
