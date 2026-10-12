# Fixes for independent review findings 1–9

All changes are in src/. No SENSEI levels, PUZZLES data, MASTERS data, masters-page code, or generated site files were changed.

| Finding | Targeted change (file/function) | Regression check in src/regress.test.js |
| --- | --- | --- |
| 1 | app.js store.set returns a boolean; finish/logGame retain recovery until both statistics and result writes succeed and show Thai feedback on failure. home.js profile submit and backup restore report write failures. | 1 recovery survives failed result writes; 4 restore invalidates live game and reports write failure |
| 2 | home.js parseCode validates and preserves tw/tl and mode. Missing teaching counters default to zero; missing mode retains the old real-game interpretation. | 2 teaching backup round trip and legacy defaults |
| 3 | home.js makeCode exports tList; parseCode validates teacher entries with tClean, computes canonical IDs, and retains matching completions; restore persists the collection. Older backups default to an empty collection. | 3 validated teacher puzzles and completions round trip |
| 4 | home.js restore calls toLobby to invalidate callbacks and cancel deep/practice state, then clears G/S/over/pre/rec before replacing data. | 4 restore invalidates live game and reports write failure |
| 5 | app.js startGame checks tokens on Kata initialization success/failure before mutation; botTurn captures its opponent/engine and checks tokens before handling rejection. | 5 stale Kata initialization and analysis cannot mutate newer games |
| 6 | home.js saveGame/readGame persist degraded; app.js startGame restores the sticky flag. Legacy saves default to false; degraded wins remain excluded even after successful engine initialization. | 6 degraded save and resume excludes wins |
| 7 | sw.js cache names include encoded registration-scope path; activation deletes only obsolete caches with that exact prefix. | 7 cache cleanup is application and scope specific |
| 8 | app.js Player.load increments a generation; delayed ladder replies reject obsolete generations after reset or puzzle replacement. | 8 stale ladder replies after reset and replacement |
| 9 | engine.js moveFacts compares minimum stone indices as canonical group IDs and checks diagonal false-eye conditions. eyeFill and the bot's use of it are unchanged. | 9 canonical eye groups and diagonal false eyes |

## Validation

- node src/regress.test.js: ALL REGRESSIONS OK (mock DOM, localStorage, timers, deferred engine promises, and CacheStorage; no browser/network calls).
- node src/test.js: ALL OK. An earlier run hit the existing randomized AI simulation's move cap on 9x9; the rerun passed. No bot logic or test limits were changed.
- node --check passed for every edited JS file: app.js, home.js, engine.js, sw.js, regress.test.js.
- git diff --check passed.

## Deliberately unchanged and limitations

- No numbered finding was deferred. Legacy unscoped samnak caches are retained: their owning deployment cannot be established safely on a shared origin. Future obsolete scoped caches are cleaned up.
- No generated build was made, as this task requests source-only fixes.
- Storage writes across separate keys remain non-transactional. Restore reports any failed write; this minimal fix does not add a storage transaction system.
- Local commits were attempted but the managed permission profile makes .git read-only. Git failed to create .git/index.lock (Permission denied). No commits could be created and nothing was pushed. Intended small commit messages: Fix canonical real-eye detection and diagonal false eyes; Scope service worker cache names and cleanup to this deployment; Fix recovery, backup fidelity, and stale game and puzzle callbacks; Document review fixes and regression validation.
- REVIEW-INPUT.md was already untracked and was left untouched.
