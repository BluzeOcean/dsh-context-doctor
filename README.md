<h1 align="center">Context Doctor</h1>

<p align="center">
  <strong>DSH context-injection audit plugin: see exactly what every model request is carrying, and find duplicated, conflicting, or wasteful injectables.</strong>
</p>

<p align="center">
  <strong>Read-only</strong> ·
  <strong>Per-item token cost</strong> ·
  <strong>Actionable trimming suggestions</strong>
</p>

<p align="center">
  <a href="https://github.com/BluzeOcean/dsh-context-doctor/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/BluzeOcean/dsh-context-doctor?style=for-the-badge&color=eab308"></a>
  <a href="LICENSE"><img alt="License BSD-3-Clause" src="https://img.shields.io/badge/License-BSD%203--Clause-blue.svg?style=for-the-badge"></a>
  <a href="https://github.com/BluzeOcean/dsh-context-doctor/commits/main"><img alt="Version 0.7.2-bluze.1" src="https://img.shields.io/badge/Version-0.7.2--bluze.1-green.svg?style=for-the-badge"></a>
  <a href="https://github.com/deepseek-ai/awesome-deepseek-agent"><img alt="For DeepSeek Harness" src="https://img.shields.io/badge/For-DeepSeek%20Harness-8257D0.svg?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="#about-this-fork">About this fork</a> ·
  <a href="#why">Why</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#agent-setup">Agent setup</a> ·
  <a href="#what-it-does">Features</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#faq">FAQ</a> ·
  <a href="#license">License</a>
</p>

## About this fork

This is a personal fork of [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor), maintained because the upstream repository has been quiet since **2026-09-06** (last commit; several open PRs including a fix for the symbol-mismatch bug we hit on 0.1.6-alpha.2 have been sitting unreviewed for 36+ days). Bug fixes and improvements land here first; if upstream becomes responsive again I'll happily upstream the patches.

**Install from this fork:**

```sh
dsh plugin --profile web add "github:BluzeOcean/dsh-context-doctor#main"
```

The rest of this README is the same audit pipeline as upstream — same features, same model-tool interface, same panel UI. Where the fork diverges, the change is documented in the commit log.

## Why

Every DSH request silently carries a stack of injectables: layered `AGENTS.md` instruction chains, hundreds of skill catalog summaries, dozens of tool schemas, MCP tool surfaces. They consume input tokens, often contain cross-file duplicate paragraphs, hide skills behind same-name shadowing, and bloat the tool surface — yet no one quantifies it until a context warning fires.

| Before | After |
|---|---|
| Token meter only hints at the cost, no breakdown by source | Token estimates per category: instruction chain / skill catalog / tool schema / MCP |
| Duplicate instructions and skills hidden across files | Auto-detects byte-identical duplicate blocks and duplicate skill descriptions |
| Same-name skills from multiple sources silently shadow each other | Reports winner and shadowed skills (rank shadow) |
| Warnings trigger manual file digging | Model can call `context_audit` directly for a sectioned report and severity-sorted trimming suggestions |

## Quick Start

> **Host version requirement**: DSH `>= 0.1.2-rc.1` (validated against 0.1.2-rc.1). 0.1.2 reshuffled the client module table (`dsh-client-runtime` → `dsh-client-store`); older hosts should pin [`v0.6.1`](https://github.com/Zhenyu98/dsh-context-doctor/releases/tag/v0.6.1) — a version mismatch crashes **the entire web shell**, not just this plugin (see [issue #9](https://github.com/Zhenyu98/dsh-context-doctor/issues/9)). `@deepseek-ai/cordis` and `@deepseek-ai/dsh-tools` are peer dependencies provided by the host profile; the plugin does NOT bundle them (bundling would mint a second tool dispatcher — see [issue #2](https://github.com/Zhenyu98/dsh-context-doctor/issues/2)).

```sh
# 1. Install (official bundle plugin mechanism; built artifacts are committed, no build step needed from git source)
dsh plugin --profile web add "github:BluzeOcean/dsh-context-doctor#main"

# 2. Verify the resolved tree contains the entry
dsh --profile web --dump-config | grep context-doctor

# 3. Restart dsh web; ask the model in a new session to run
context_audit
```

Expected success signal:

```text
dsh --profile web --dump-config | grep context-doctor
# - insert:
#     - id: context-doctor
#       name: 'dsh-context-doctor'
```

After restart, a `Context Doctor` control appears to the left of the send button in existing sessions. The model can also call `context_audit` directly. Panel text follows the DSH locale setting; new sessions don't show session-level controls until a `sessionId` is assigned.

## Agent Setup

Send this to Codex, Claude Code, Cursor, or any agent inside DSH:

```text
Please read https://github.com/BluzeOcean/dsh-context-doctor/blob/main/agent-setup.md
and install and configure Context Doctor (DSH context-injection audit plugin) following the steps there.
Goal: after install I should see the Context Doctor panel in dsh web, and the model should be able to call context_audit.
Before modifying files, using credentials, publishing, or running destructive commands, show me the plan and get my approval.
```

Full install, verify, and troubleshooting: see [agent-setup.md](agent-setup.md).

## What it does

### Two surfaces

1. **Web UI `Context Doctor` panel** (left of the send button in existing sessions, alongside the built-in meter; trigger is a 30×30 icon-only button whose color encodes state, name in tooltip). A budget rail at the top draws the 10k / 30k thresholds as visible ticks — how far you are from the warning line is now explicit. The rail segments into four non-overlapping categories (instruction chain / skill catalog / native tool schema / MCP tools). Each segment drills into entries — instruction files by file, skills by source, tools by individual schema, MCP by server — answering "who is using the budget?". Panel text follows DSH locale; body text uses the host UI font with monospace only for numbers; click outside or press Esc to dismiss. Panel auto-follows DSH's light/dark/system theme and scrolls in narrow viewports. Data is pulled from `GET /api/context-doctor/audit` (host-side 60s cache).
2. **`context_audit` model tool**: full audit report (including rank-shadow conflicts and severity-sorted suggestions), callable by the model so it can act on the recommendations.

### Audit coverage

| Injectable | What we audit | Cost nature |
|---|---|---|
| **Instruction chain** | `AGENTS.md` / `CLAUDE.md` at every layer from git root to cwd: file count, token estimate, **byte-identical duplicate blocks across files** | Per-request resident |
| **Skill catalog** | All skills in `ctx.skills` (`name + description`, which the model sees each request as `<available_skills>`), grouped by source, **duplicate descriptions** | Per-request resident |
| **Tool schema** | All tools visible to the current agent (`ctx.tools.schemas`): count, schema-token estimate, native vs MCP split | Per-request resident |
| **MCP tool surface** | MCP tools grouped by server (`mcp__<server>__<tool>` naming parsed), tool count and schema tokens — surfaces tool-bloat | Per-request resident |
| **Skill bodies** (opt-in) | Total tokens for the first N skill bodies (on-demand, not resident; for "resident vs on-demand" comparison) | On-demand |

**Conflict detection**: when the same skill name comes from multiple sources (e.g. project skill shadows a bundled skill), report the winner and which are silently shadowed.

## Usage

Model calls the tool directly:

```
context_audit                                 # audit current session cwd
context_audit cwd=/path/to/project
context_audit includeSkillBodies=true maxSkillBodies=20
context_audit detail=developer                # summary + locatable context-audit receipt
```

Output is canonical JSON (`AuditReport`):

```jsonc
{
  "tool": "context_audit",
  "version": 1,
  "cwd": "/path/to/project",
  "injected": {
    "instructions": { "files": [{ "path": "...", "bytes": 3421, "tokens": 812 }], "totalTokens": 812, "duplicateBlocks": [...] },
    "skills": { "catalogCount": 177, "catalogDescriptionTokens": 4150, "bySource": [...], "duplicateDescriptions": [...] },
    "tools": { "visibleCount": 42, "schemaTokens": 9800, "nativeCount": 38, "nativeTokens": 6100,
               "mcp": { "servers": [{ "server": "github", "tools": 12, "schemaTokens": 2400 }], "totalTools": 12, "totalTokens": 2400 } }
  },
  "conflicts": [{ "name": "skill-x", "winner": {"source": "project-dsh", ...}, "shadowed": [...] }],
  "suggestions": [{ "severity": "high", "text": "..." }]
}
```

The native renderer turns this into a sectioned, human-readable report (instruction chain / skills / tools / conflicts / suggestions) so the model can act on the suggestions directly.

### Two output levels

- **Default summary**: cost, conflicts, and severity-sorted fix suggestions — appropriate for every diagnostic call.
- **`detail=developer` receipt**: adds the `context-audit receipt` listing each loaded `AGENTS.md` / `CLAUDE.md` (path, bytes, tokens, load order, duplicate-block preview), skills injected via catalog (name, source, provider, description bytes), every tool schema (serialized bytes + signature), duplicate MCP signatures, shadowed-skill relationships, and actionable fix suggestions.

`trimmed` only reports items when DSH exposes the context-assembly trace; the current version hardcodes it as `unavailable` to avoid mis-reporting unobservable state as trimmed. The receipt never contains the full prompt or skill bodies — agents can fetch specific paths/names on demand.

## Configuration

```yaml
context-doctor:
  defaultCwd: /path/to/project   # default audit cwd when the browser panel omits one (defaults to process cwd)
  cacheTtlMs: 60000              # audit-result cache TTL (ms)
```

## Security boundaries

- **Read-only**: uses only the read/stat/list subset of `ctx.fs`. Never writes or deletes; never executes any audited object.
- **Size cap**: files > 256 KB are skipped to keep the auditor itself from being dragged down.
- **No body output**: reports contain paths, stats, and duplicate-block previews — never full file contents. Skill bodies are only counted, never output.
- **Tokens are heuristic estimates** (ASCII ≈ 4 chars/token, CJK ≈ 1.5 chars/token), for relative comparison; the model tokenizer is the source of truth for exact values.

## FAQ

**Control didn't appear after install?**

Restart `dsh web` and enter an existing session's composer. New sessions don't show session-level controls until a `sessionId` is assigned. If still missing, first confirm `dsh --profile web --dump-config` contains the context-doctor entry, and that the browser-bundle artifact exists (you must run `./scripts/build.sh` if you changed source).

> Versions ≤ v0.5.0 registered the control on `conversation.input.context` — a slot that no published DSH ever shipped, so the control was silently dropped ([issue #4](https://github.com/Zhenyu98/dsh-context-doctor/issues/4)). v0.5.2+ uses the native slot `conversation.input.right` and needs no DSH patch.

**No web UI (headless / CLI) — can I still use it?**

Yes. `context_audit` does not depend on the web: the plugin auto-skips route registration when no `httpServer` service is present (e.g. headless profile); the tool still works. Validated under `dsh --profile headless`.

**Audit totals don't match the meter?**

The meter is the model-side actual token; this plugin's tokens are heuristic estimates (ASCII ≈ 4 chars/token, CJK ≈ 1.5 chars/token), for relative comparison and triage. The model tokenizer is the source of truth for exact values.

**Will the plugin modify my files?**

No. The audit path is read-only: only the read/stat/list subset of `ctx.fs`, no writes, no deletes, no execution of audited objects.

**How are MCP tools grouped?**

By parsing the `mcp__<server>__<tool>` naming to extract the server, then summarizing tool count and schema-token per server — surfaces tool-surface bloat.

**Will private files end up in the report?**

No. Reports contain paths, stats, and duplicate-block previews only — never full file contents. Skill bodies are only counted, never output.

## Development

```sh
./scripts/setup-dsh-deps.mjs   # locate the local DSH checkout and link deps (first time)
node --test 'tests/*.test.ts'  # node --test (Node ≥ 22.19, native TS support, zero test deps)
./scripts/build.sh             # setup + tsc (lib/types) + tsdown (lib/index.js + lib/client.js)
```

39 test cases covering: release-artifact purity guards (host runtime must be external — see [issue #2](https://github.com/Zhenyu98/dsh-context-doctor/issues/2)), token estimation, duplicate block / description detection, rank shadow, MCP grouping, instruction-chain end-to-end (real temp filesystem + fake FileSystem), plugin entry and full execute-report chain, session-cwd routing, HTTP routing (method check + real audit response + cache eviction), headless without httpServer.

## Known limits

- The control sits beside DSH's built-in context meter — it does not replace it. `conversation.input.right` is a `kind: 'list'` slot, so it doesn't crowd any existing control.
- Instruction-chain duplicate detection is byte-identical block matching only, not semantic similarity; cross-file references to the same fact phrased differently are not detected.
- MCP tool-schema tokens are estimated from `name + description`, not the JSON Schema parameter details.
- Skill-body accounting is off by default (loading bodies has cost); catalog-summary cost is always counted.

## Star History

<a href="https://star-history.com/#BluzeOcean/dsh-context-doctor&Date">
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=BluzeOcean/dsh-context-doctor&amp;type=Date" width="70%">
</a>

## Acknowledgements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — plugin host and official bundle plugin mechanism
- [plugin-registry](https://github.com/dsh-external/plugin-registry) — plugin development guidelines and make-dsh-plugin scaffolding
- [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor) — original upstream; this fork would not exist without it

## Contributing

Issues and pull requests welcome on this fork. Please keep reports specific, include repro steps, and avoid secrets in logs and screenshots.

## License

BSD-3-Clause — see [LICENSE](LICENSE).
