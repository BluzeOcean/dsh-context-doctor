# Context Doctor (BluzeOcean fork)

DSH context-injection audit plugin. Quantifies what every model request
silently carries — instruction chain tokens, skill catalog tokens, tool
schema tokens, MCP tool surface — and surfaces duplicates, conflicts,
and over-broad skills.

## Origin

Personal fork of [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor),
maintained because upstream has been quiet since 2026-09-06 (several open
PRs — including a fix for the symbol-mismatch bug — have sat unreviewed
for 36+ days). Bug fixes and improvements land here first; if upstream
becomes responsive again, I'll happily upstream the patches.

This fork tracks upstream `main` and adds fork-specific commits on top.

## What it does

Audits four categories of per-request injectables:

| Category | What it counts |
|---|---|
| **Instruction chain** | Every `AGENTS.md` / `CLAUDE.md` from git root to cwd |
| **Skill catalog** | Every skill's `name + description` (visible to the model as `<available_skills>`) |
| **Tool schema** | All tools visible to the current agent |
| **MCP tool surface** | MCP tools grouped by server (`mcp__<server>__<tool>`) |

Plus **conflict detection**: when the same skill name comes from multiple
sources, reports the winner and which are silently shadowed.

Two surfaces:

- **`Context Doctor` panel** in the web UI — icon button next to the send button, color-coded state, drill-down to per-entry stats
- **`context_audit` model tool** — sectioned report with severity-sorted trimming suggestions

## How it does it

Read-only. Uses only the `read`/`stat`/`list` subset of `ctx.fs`.
Estimates tokens heuristically (ASCII ≈ 4 chars/token, CJK ≈ 1.5
chars/token). Skips files > 256 KB. Reports never contain full file
contents — only paths, stats, and duplicate-block previews.

Pipeline:

```
ctx.skills.list()    ──┐
ctx.tools.schemas()  ──┼──▶ AuditReport { instructions, skills, tools, conflicts, suggestions }
ctx.fs (chain)       ──┘
```

Exposes one HTTP route: `GET /api/context-doctor/audit` (host-side 60s cache).

## Install

```sh
dsh plugin --profile web add "github:BluzeOcean/dsh-context-doctor#main"
```

Restart `dsh web`. A `Context Doctor` icon appears to the left of the
send button in existing sessions; the model can also call `context_audit`
directly in any session.

> **Host**: DSH `>= 0.1.2-rc.1`. A version mismatch crashes the entire
> web shell, not just this plugin — pin [`v0.6.1`](https://github.com/Zhenyu98/dsh-context-doctor/releases/tag/v0.6.1)
> for older hosts.

## License

BSD-3-Clause. See [LICENSE](LICENSE).
