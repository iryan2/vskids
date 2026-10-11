# Vibekids Roadmap

A kid-first, vibecoding app for a 9-year-old. The loop: describe what you want to
the helper on the right, watch it appear in the live preview on the left, and
press the one big **Save** button. Code is a secondary concern.

## Decisions (locked)

- **Helper pane:** a custom, friendly chat webview — not the raw opencode TUI.
  Driven by `opencode acp` (Agent Client Protocol, JSON-RPC over stdio), which
  the extension bridges to the webview.
- **Saving:** explicit. The Save button commits; no silent auto-save.
- **Distribution:** a few family Macs — requires a signed + notarized DMG.
- **Sequencing:** feature-first, with the small set of correctness blockers
  (M0) fixed alongside.
- **Chrome:** hide UI entry points via extension config defaults; no core edits.

## Baseline (done)

Welcome → create/open project → live-reloading preview (left) + opencode terminal
(right) + Save (git commit). Branded `Vibekids.app` builds and boots.

---

## M0 — Blockers (ship with the first feature PR)

These make the app actually usable on a fresh machine.

- **Git identity.** Set repo-local `user.name` / `user.email`
  (`Vibekids <hello@vibekids.app>`) and a default branch at project creation.
  Without it, `commit` fails on a machine with no global git config.
- **opencode launch.** A Finder-launched app has a minimal `PATH`, so a
  dev-`PATH` `opencode` is not found. Resolve an absolute path (self-locate,
  bundle, or a guided first-run setup that records it), and show a large,
  friendly message when it is missing.
- **Dev server.** Ignore `.git` / `node_modules`, debounce the watcher, serve a
  styled 404, and shut down cleanly when the window closes.
- **Layout.** Verify the header / preview / helper arrangement in a real window;
  add a graceful preview + terminal fallback when a command is unavailable.

## M1 — Onboarding & project gallery (feature-first)

- Multiple starter templates (Hello App, Drawing, Game, Story) with a fun,
  visual picker.
- First-run tour: "this is your app" / "this is your helper".
- Project gallery: thumbnails (capture the running app via the browser's CDP
  session), rename, delete, and richer recents.

## M2 — Kid-friendly authoring

- "Add a picture": imports an image into the project and inserts the markup.
- Emoji picker for text.
- "Oops, undo my last change" plus a simple time-travel list of saves.

## M3 — Custom chat webview (the heart)

- Spawn `opencode acp`; bridge webview ⇄ JSON-RPC in the extension host.
- Kid-safe `opencode` agent config: warm persona, restricted tools/permissions,
  project-scoped file access. Model selectable via `opencode models`
  (`--model`), agent via `--agent`, seeded prompt via `--prompt`.
- First-run provider auth via `opencode providers`.

## M4 — Polish & family distribution

- Rebrand `resources/darwin/code.icns` and the DMG background.
- Themed, rounded, large-type look.
- One-command DMG script; signing + notarization for family Macs.

## M5 — Build, CI & maintenance

- Fix or exclude the Copilot CI step; add a `vibekids-darwin` npm script.
- Smoke test that launches the app and asserts the welcome screen appears.
- Unit tests for `devServer` and `projects`.
- Document the upstream sync workflow (`upstream` remote, merge, `rerere`).

---

## Upstream sync

Keep `microsoft/vscode` as `upstream`. Work on the `vskids` branch and periodically:

```
git fetch upstream
git merge upstream/main      # merge, never rebase
git config rerere.enabled true
```

Because the product lives in a new extension folder and only `product.json`
plus one build-list line are touched, merges should stay conflict-free.

## Open design questions

- Where gallery thumbnails are stored, and how quickly they go stale.
- What "undo my last change" means precisely: revert the last commit, or reset
  the working tree.
- How the helper is authenticated and which model is the default.
