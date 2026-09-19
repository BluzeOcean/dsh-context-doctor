/**
 * The refresh control's presentation contract: what the footer button shows
 * and the stylesheet that gives it the interaction states inline styles cannot
 * express.
 *
 * Split out of `ContextAuditRing.tsx` on purpose. The panel is one long
 * component that a test cannot import without a DOM and a React runtime; the
 * feedback rules are the part users actually feel when they click, so they live
 * where `node --test` can reach them. Nothing here touches the DOM.
 * @module dsh-context-doctor/client/refresh
 */
/** `id` of the injected stylesheet; doubles as the "already injected" guard. */
export declare const REFRESH_STYLE_ID = "context-doctor-refresh-css";
/** What the footer refresh control is showing right now. */
export type RefreshPhase = 'idle' | 'loading' | 'settled';
/** Phase plus the strings and flags one render of the control needs. */
export interface RefreshView {
    phase: RefreshPhase;
    label: string;
    /** Spins the glyph while a request is in flight. */
    spinning: boolean;
    /** Pops the glyph into a check once, right after a manual run lands. */
    flash: boolean;
    /** Seconds the in-flight request has been running; tooltip/aria text only. */
    elapsed: number;
}
/** Seconds behind a timestamp, never negative; `null` reads as absent. */
export declare function ageSeconds(refreshedAt: number | null, now: number): number;
/**
 * Decide what the refresh control shows.
 *
 * Pure on purpose: every visual state is a function of store state plus the
 * one-shot flash flag, so the whole feedback contract is testable without a
 * DOM. The control is decoration over an async request — it derives from the
 * lifecycle the store already owns instead of keeping a second copy.
 *
 * @param phase - store lifecycle, collapsed to "in flight" vs "not".
 * @param flash - true while the post-success check is showing.
 * @param elapsed - seconds the in-flight request has been running.
 * @param t - namespace-scoped translator.
 */
export declare function refreshView(phase: RefreshPhase, flash: boolean, elapsed: number, t: (key: 'cd.refresh' | 'cd.refreshing' | 'cd.refreshed') => string): RefreshView;
/**
 * Stylesheet for the refresh control: the interaction states and keyframes that
 * inline styles cannot express, which are exactly what makes the control read as
 * a button. Every rule carries the control's own `[data-cd-scope]` attribute, so
 * nothing here can reach another button in the host shell. The media blocks keep
 * the motion advisory rather than mandatory.
 *
 * Colours are literal hexes with the shell's custom properties layered on top,
 * matching the panel's own `TONE` fallbacks: the bundled `client.js` cannot
 * depend on the shell having defined them.
 */
export declare const REFRESH_CSS = "\n[data-cd-scope][data-cd-refresh] {\n  box-sizing: border-box;\n  border-radius: 7px;\n  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 70ms ease;\n}\n[data-cd-scope][data-cd-refresh]:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-3, #252d3b); border-color: var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.3)); }\n[data-cd-scope][data-cd-refresh]:active:not(:disabled) { transform: scale(.96); }\n[data-cd-scope][data-cd-refresh][data-pressed='true']:not(:disabled) { background: var(--dsw-alias-bg-layer-3, #252d3b); border-color: var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.3)); transform: scale(.96); }\n[data-cd-scope][data-cd-refresh][data-cd-spin='true'] svg { animation: cd-refresh-spin 700ms linear infinite; }\n[data-cd-scope][data-cd-refresh][data-cd-flash='true'] svg { animation: cd-refresh-pop 460ms cubic-bezier(.2, .9, .3, 1.25); }\n[data-cd-scope][data-cd-refresh][data-cd-flash='true'] { color: var(--dsw-alias-state-success-primary, #4fc281); border-color: color-mix(in srgb, #4fc281 45%, transparent); }\n[data-cd-scope][data-cd-refresh]:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #7c9bff); outline-offset: 2px; }\n@keyframes cd-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n@keyframes cd-refresh-pop { from { transform: scale(.55); opacity: .3; } to { transform: scale(1); opacity: 1; } }\n@media (prefers-reduced-motion: reduce) {\n  [data-cd-scope][data-cd-refresh] { transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }\n  [data-cd-scope][data-cd-refresh][data-cd-spin='true'] svg { animation-duration: 1800ms; }\n  [data-cd-scope][data-cd-refresh][data-cd-flash='true'] svg { animation: none; }\n  [data-cd-scope][data-cd-refresh]:active:not(:disabled) { transform: none; }\n  [data-cd-scope][data-cd-refresh][data-pressed='true']:not(:disabled) { transform: none; }\n}\n@media (forced-colors: active) {\n  [data-cd-scope][data-cd-refresh][data-cd-spin='true'] svg,\n  [data-cd-scope][data-cd-refresh][data-cd-flash='true'] svg { animation: none; }\n  [data-cd-scope][data-cd-refresh]:focus-visible { outline-color: Highlight; }\n}\n";
