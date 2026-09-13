# SCN-G01-00 HOPA Quality Self-Review

## Current verdict — 2026-09-14

**NOT READY / PMO NOT PASSED.** This is implementation self-review, not owner acceptance. Latest code remediation: local commit `f451d1b411f2c33130f3f2e953dea234e4c0e3ec`. Godot 4.7.2 import, headless tests, runtime smoke, provenance (8 assets), Windows export and an isolated exported-EXE launch passed. These gates do not prove ordinary-player quality or duration.

Only SCN-G01-00 is in scope. PR #23 remains Draft and unmerged; Issue #22 stays open; PR #21 and subsequent-scene gameplay are not changed. No READY signal is issued for this candidate.

Remote synchronization reached `7fded8f5c007fac55940991ed2a508ca7dd6f77e`, with the exact locally verified Godot subtree `f7a47a96bb754dacc49d675aa84484ae8dc77592`. Its Windows Actions gate then failed 24 assertions because the test suite depended on a local-only `.superpowers` preflight script and a local ignore rule. This is a fresh-checkout delivery defect, not a passing cloud build. Remediation moves preflight to the tracked `scripts/godot-review-preflight.ps1`, tests real process outputs/errors/save non-mutation, and removes GDScript checks against local operator prose. The replacement is read-only and has no launch, save deletion or timing policy. Game behavior tests and runtime smoke remain required. See `docs/superpowers/plans/2026-09-14-scn00-review-evidence-runbook.md`; a new successful CI run is still required.

## Findings and remediation

The following fixes belong to `f451d1b`. Tests reproduced the defects before their fixes. A separate reviewer checked the substantive forensic/configuration, receiver and restored-save patches and found no new blocking issue. The main agent additionally inspected native-rendered fixtures and corrected datum-label overlap and an unplaced plate probe.

| Defect | Remediation and verification |
| --- | --- |
| Datum wheel / echo caliper hidden by backing plate | Raised controls above the plate; render-order tests and actual Godot fixture images |
| Source paper lacked usable measurement evidence | Authored pulse, leading echo and occupied-stop marks visible at the appropriate stage; configuration-driven coordinate tests |
| Paper numbers stacked / datum readout overlapped status | Each number centered on its tick, datum readout inside dial; red/green bounds tests and rendered images |
| Burn baseline required guessing | Four live heat traces against a fixed reference strip; alignment and visibility regressions |
| Tape IDs from JSON produced 00:00 / identical waveforms | Normalize numeric IDs; timestamps and drawn pressure/surge traces travel with physical reels; shipped-JSON tests and runtime swap/resume assertions |
| Plate alternatives were invisible | Expose continuous approved groove, broken old B→C groove and dead end after lift; gating, geometry and recoverable rejection tests |
| Receiver gain / phase required guessing | Live amplitude trace, reference band, phase marker and measured reference notch; low/aligned/overshoot tests |
| Legitimate JSON receiver saves rejected; inconsistent restored-power saves accepted | Numeric array comparison plus physical prerequisites and phase consistency; valid resume and malformed-state tests with rejection non-mutation |
| Repair objective revealed operation sequence | Refer back to repair evidence without listing the answer; objective/hint and runtime modal-guidance tests |
| Test title-save path and leaked fixture | Test-only save service, isolated APPDATA, fixture disposal and per-suite orphan balance |

## Player path and product criteria

Intended path: incident brief → find/aim hand light → compare evidence surfaces → calibrate and scan burn → reconstruct paper tape → lift and trace revision plate → investigate layered locker, move tools and release fuse clips → explicitly analyze/connect clues → synthesize repair record → isolate B and measure diagnostic evidence → install fuse and operate coupler/protector → staged restoration → separate and retain both stern records.

- **Exploration / seven clues:** seven authored clues remain. Three cockpit clues require observation, interpretation and a distinct physical mechanism; locker actions involve actual obstructions and fuse clips. Runtime smoke covers the chain; natural discoverability and environmental density still need current-EXE review.
- **Four deductions / reversal:** explicit analysis and relationships are required. `CLUE-007 supersedes CLUE-006` excludes obsolete B→C. Test coverage does not establish that a first-time player can infer every relationship.
- **Mathematics:** datum, signed echo offset, 12-stop cycle, spacing and occupied-slot exclusion feed separate world-native measuring operations. Visible traces address prior guessing. No waiting, repeated calibration or dialogue is allowed to manufacture duration.
- **Objects / payoff:** fuse, B isolation, A↔C coupler and protector remain separate stateful controls. Power restores in stages; two conflicting records are kept without advancing to another scene.
- **Presentation:** inherited cockpit art anchors the world, but several code-drawn close-ups are more schematic than the painted scene. This remains a quality limitation, not an automatic mature-HOPA pass.
- **Readability:** eight isolated Godot component fixtures were rendered at both 1920×1080 and 1366×768; representative images were visually inspected. They are explicitly labeled NOT PLAYTHROUGH EVIDENCE and do not prove full-screen HUD coexistence or the complete exported route.

## Wrong actions, recovery and hints

- Wrong interpretations and board relations give evidence-based feedback; accepted clues and relations survive.
- Uncalibrated scans, wrong tape order/faces, early plate lift and invalid grooves award no clue and consume no tool. Partial progress resumes.
- Wrong datum, echo pair, occupied map or shutters preserve confirmed measurements; the player adjusts the same control.
- Early fuse/coupler/protector and wrong-item actions preserve inventory and established safe progress.
- Receiver gain/phase errors or sealing with only one retain gate do not discard either record. Both gates are necessary.
- Corrupt/inconsistent saves are rejected without changing live state; legitimate partial/completed JSON saves are tested. All further automated checks use isolated APPDATA/test filenames, never a player's save.
- Three hint tiers progress from observation direction to evidence type and a concrete nudge after genuine stalled time. They must not disclose final relations or repair order. Runtime smoke checks visibility and input, not human comprehension.

## Novel continuity and originality

The authored scene bridges the project novel's Chapters 12 and 13: 应龙's `不完美。可修正。准予远航。`, departure from 百工星环, approach to 零号地球, blockade impact through B, and Rev.3 reversing 星宇's old repair habit. The weak sender remains UNKNOWN. Both conflicting records are retained at SCN-G01-00 / SLICE_COMPLETE; no SCN-G01-01 gameplay is included. No G5 assets, concrete interface, plot, brand or identifiable trade dress were copied.

## Evidence gate still open

The 2026-09-11 actual Windows run of `6503c55` reached the ending in 1253.59 seconds (20:53.59), but exposed the visibility/fairness defects above and used a route already known to the operator. It is diagnostic recording, **not** valid ordinary-player duration evidence for the fixed candidate. The older 918.4-second recording is also stale.

The next acceptance run must use the synchronized PR HEAD's Windows build and a clean save, with continuous ordinary UI input and no state injection, preloaded save, edits or artificial delays. Required outputs remain: uncut video; exploration, deduction and power extracts; both-resolution key screenshots; duration/resolution/SHA-256 manifest; accessible artifacts; independent experience review. READY and CI evidence must bind to the actual PR HEAD.

Implementation and evidence synchronization to the existing Draft PR is authorized. The old claim that pushing was forbidden was incorrect and is removed. Until current evidence and second formal review are valid, continue remediation and retain NOT READY. Final Windows hands-on acceptance belongs only to the project owner.
