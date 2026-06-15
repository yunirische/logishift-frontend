# LogiShift Frontend Agent Guide

Follow the canonical workspace rules in [AGENTS.md](C:/logishift/AGENTS.md).

Frontend-specific defaults:

* Work in `C:\logishift\logishift-frontend`.
* Run `git diff --check`, `npx tsc --noEmit`, and `npm run build` for frontend changes.
* Use `logishift-frontend-deploy` for production frontend deploy tasks.
* Do not touch backend, docs, or production env unless the task explicitly includes them.
