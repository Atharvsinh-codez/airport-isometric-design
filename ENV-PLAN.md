# Environment blueprint plan (org-level)

What this session had to set up by hand, and what the suggested blueprint persists:

1. **Node 22** — the VM had no `node`. Install the official 22.11.0 Linux x64 tarball under `~/tools/node` and put `~/tools/node/bin` on PATH via `$ENVRC`.
2. **Skill clones** — `https://github.com/Leonxlnx/unlazy` → `~/repos/unlazy`, `https://github.com/wheresryan22/anatomy` → `~/repos/anatomy-skill` (both read as SKILL.md + kit/scripts; idempotent `git -C … pull` if present).
3. **Chrome for headless captures** — the kit scripts read `CHROME_PATH`; set it to the VM's `~/.local/bin/google-chrome`.
4. **Knowledge** — how to build/check an anatomy figure: `node build.mjs [--light]`, `node scripts/lines.mjs`, `node scripts/capture.mjs`, `node ~/repos/unlazy/scripts/gate-lint.mjs GATES.md`.

Nothing else (esbuild is a per-project devDependency, installed by `npm install` in the project).
