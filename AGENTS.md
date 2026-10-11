# Vibekids — Agent Instructions

This is a fork of `microsoft/vscode` that ships a kid-first, vibecoding app built
for the author's 9-year-old daughter. The experience is: **the live app preview on
the left, a friendly helper on the right, and a single Save button — nothing else.**

See also [.github/copilot-instructions.md](.github/copilot-instructions.md) for the
upstream VS Code architecture, coding conventions, and validation guidance. Those
rules still apply here.

## Golden rule: keep the fork diff minimal

Do NOT edit VS Code core (`src/`) to build product features. The product lives
almost entirely in one built-in extension. Upstream merges must stay trivial.

Files we intentionally touch outside the extension:

- `product.json` — branding only (name, applicationName, dataFolderName,
  darwinBundleIdentifier, urlProtocol).
- `build/gulpfile.extensions.ts` — add `extensions/vskids/tsconfig.json`.
- `resources/darwin/*.icns` — app/file icons (rebrand step).
- `build/npm/dirs.ts` — ONLY if the extension gains dependencies. It currently
  has none and must NOT be listed, or `npm ci` fails for want of a lockfile.

Everything else belongs in `extensions/vskids/`.

## Where the product lives

`extensions/vskids/` — the entire product UX (built-in extension).

- `src/extension.ts` — activation + command wiring.
- `src/welcome.ts` — custom full-screen welcome (New/Open/recent).
- `src/kidMode.ts` — arranges the window (header / preview / helper).
- `src/header.ts` — slim header with the single Save button.
- `src/devServer.ts` — in-process static server + SSE live reload.
- `src/git.ts` — Save = stage-all + commit (hides git).
- `src/projects.ts` — create/open projects, templates, recents, marker file.
- `src/webview.ts` — CSP/nonce/escape helpers.

Project convention on disk: each project has a `.vskids/config.json` marker.

## Build & run

- Node: use the version in `.nvmrc` (currently 24.18.0+). `fnm use`.
- Install: `npm install` (use `npm install`, not `npm ci`, after touching dirs).
- Fast dev loop: `npm run build-fast`, then launch via `scripts/code.sh`.
- Compile just the extension: `npm run gulp -- compile-extension:vskids`.
- Typecheck just the extension: `npm run gulp -- compile-extension:vskids` (tsgo
  reports type errors) — or the extension's `tsconfig.json` directly.
- Package the macOS app: `npm run gulp -- vscode-darwin-arm64` (outputs
  `../VSCode-darwin-arm64/Vibekids.app`).
- Lint changed files: `npm run eslint -- <files>`.

## Known caveats

- The `vscode-darwin-arm64` task's final CI step
  (`prepareBuiltInCopilotRipgrepShim`) fails unless the Copilot SDK was built
  (`npm run compile-copilot`). The `.app` still builds and runs.
- A GUI-launched app has a minimal `PATH`; a developer `opencode` on `PATH` will
  NOT be found. See `vskids.opencodeCommand` and the launcher plan in
  [docs/ROADMAP.md](docs/ROADMAP.md).

## Conventions

- Tabs, not spaces. Microsoft copyright header on every file.
- Single quotes, except user-visible strings which use `nls.localize` / `%key%`.
- Never commit unless explicitly asked.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
