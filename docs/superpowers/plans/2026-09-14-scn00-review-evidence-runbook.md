# SCN-G01-00 current-build evidence runbook

This is an operator checklist, not a scripted playthrough or acceptance result.
Only SCN-G01-00 is authorized. Keep PR #23 Draft, unmerged and Issue #22 open.

## Build identity and save safety

1. Read PR HEAD immediately before building. Record that SHA, the exported source
   tree identity, Godot version and all commands/results. Distinguish a local
   source-equivalent build from a build checked out at the PR commit itself.
2. Export Windows x86_64 into a new candidate directory. Keep EXE and PCK together.
3. Use `scripts/godot-review-preflight.ps1` under PowerShell 7 with explicit
   `-ExePath`, `-PckPath`, `-SaveRoot` and `-Resolution` (1366x768 or 1920x1080).
   It only reports paths, SHA-256, requested resolution and whether a save exists.
   It neither launches the binary nor deletes saves. Its output is explicitly
   **not acceptance evidence**. Actual captured dimensions must be measured later.
4. Launch the candidate with a new, isolated APPDATA directory. Never delete the
   owner's save and never inject a pre-completed or edited save. Start New Game
   through the ordinary title UI. Do not use the historical local
   `.superpowers/.../actual-binary-smoke.ps1` launch helper.

## Continuous observation

Record the actual Windows client from title/New Game to the SCN-G01-00 ending.
Use normal visible UI input (the supported `@oai/sky` computer-use tool for agent
operation). Observe after each action. No internal state calls, debug route,
hidden input, artificial pacing, fixed reading rate, scheduled delays or limits
on reasonable mistakes. Keep every interruption or failed attempt in the record.
Agent-operated known-route testing must be labeled as such; elapsed time alone
does not establish ordinary first-time-player duration.

Observe the opening/hand light; all seven clue acquisitions; burn baseline and
four scans; paper timestamps, surge traces and adjacent reel swaps; cover latches
and revision grooves; locker obstructions and fuse clips; explicit analysis and
four deductions; Rev.3 superseding obsolete B-to-C; physical repair synthesis;
B isolation; datum, echo, occupied slots and safe windows; fuse, coupler and
protector; staged restoration; both receiver traces and independent retain gates;
final seal. Confirm that no next-scene gameplay becomes available.

For each discovery or failure, note timestamp, visible cause, response and
recovery. Diagnose and fix unfair guessing, unreadable labels, input conflicts,
lost progress or repetition before claiming readiness. Do not lengthen the run
with idle time or dialogue to satisfy the 15-25 minute target.

## Evidence package and gates

- Preserve the original continuous recording; derive three labeled extracts for
  exploration/forensics, deduction and physical power repair, with source ranges.
- Capture key screens at actual 1920x1080 and 1366x768 client dimensions. Synthetic
  component fixtures are diagnostic only and must never replace these captures.
- Manifest each file's relative name, role, SHA-256, bytes, measured resolution,
  duration, capture method, audio availability, source build and provenance.
- Separate unit/runtime smoke results, scripted fixtures, agent playthrough,
  ordinary-player duration evidence and owner acceptance. Never conflate them.
- Publish the Windows ZIP/checksum through the existing Actions build workflow.
  Record its run/commit and distinguish the artifact-container hash from the
  inner game ZIP checksum. Publish media to the authorized repository's review
  artifacts only through a verified upload mechanism; do not claim an upload or
  substitute a stale artifact if that mechanism is unavailable.
- Update `HOPA-QUALITY-SELF-REVIEW.md` with remaining defects and limitations.
  Only issue READY when every required current-HEAD item is valid and accessible.
  Immediately run the independent second formal review against unchanged HEAD.
  PMO PASS does not grant final product acceptance; that belongs to the owner.
