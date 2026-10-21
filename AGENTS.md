<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## BALON release policy (user requested)

- Baseline: `1.0beta` in `src/lib/app-version.ts`. This introduction does not increment the baseline.
- Increment once per delivered update, not per edit or test run.
- Small fixes: `1.0.1beta`, `1.0.2beta` (patch increments).
- Significant feature/usability improvements: `1.1beta`, `1.2beta` (minor increments, reset patch).
- Reserve `2.0` for a future major release explicitly decided by the user. Remove beta only at the user's direction.
- All UI version labels use APP_VERSION. Keep package.json and package-lock.json root versions aligned (1.0beta = 1.0.0-beta.0; 1.0.1beta = 1.0.1-beta.0).
- Record delivered changes and validation in CHANGELOG.md.
- Display brand: BALON. Do not rename legacy auth keys, cookies, DB identifiers, or environment variables merely to fix branding.
