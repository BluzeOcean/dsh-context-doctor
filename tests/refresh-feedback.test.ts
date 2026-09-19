/**
 * 刷新按钮的反馈契约（fork 的 UI 改动）。
 *
 * 面板本体是一个长组件，测试要引入它就得拖进 React 和 DOM；而「点下去有没有反应」
 * 恰恰是用户唯一能感觉到的东西，所以这条契约单独放在 `client/refresh.ts` 里，
 * 由这里用 node --test 钉住：按下会进入 loading、成功后短暂显示已更新、
 * 以及交互态样式表确实存在且被限定作用域。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REFRESH_CSS, REFRESH_STYLE_ID, ageSeconds, refreshView, type RefreshPhase } from '../src/client/refresh.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 按 key 取值的最小翻译器，与面板拿到的 `t` 同形。 */
function translator(dict: Record<string, string>): (key: string) => string {
  return (key) => dict[key] ?? key
}

const EN = { 'cd.refresh': 'Refresh', 'cd.refreshing': 'Refreshing…', 'cd.refreshed': 'Updated' }
const ZH = { 'cd.refresh': '刷新', 'cd.refreshing': '刷新中…', 'cd.refreshed': '已更新' }

test('refreshView: 空闲态是「刷新」，不转不闪', () => {
  assert.deepEqual(refreshView('idle', false, 0, translator(EN)), {
    phase: 'idle', label: 'Refresh', spinning: false, flash: false, elapsed: 0,
  })
})

test('refreshView: 请求在飞就转圈并显示进行时，秒数只作为附加信息', () => {
  assert.deepEqual(refreshView('loading', false, 4, translator(EN)), {
    phase: 'loading', label: 'Refreshing…', spinning: true, flash: false, elapsed: 4,
  })
  // 上一轮的 flash 不得盖住「正在刷新」。
  assert.equal(refreshView('loading', true, 1, translator(EN)).spinning, true)
  assert.equal(refreshView('loading', true, 1, translator(EN)).label, 'Refreshing…')
})

test('refreshView: 成功后短暂显示对勾与「已更新」，随后回到空闲', () => {
  assert.deepEqual(refreshView('settled', true, 0, translator(EN)), {
    phase: 'settled', label: 'Updated', spinning: false, flash: true, elapsed: 0,
  })
  assert.equal(refreshView('settled', false, 0, translator(EN)).flash, false)
  assert.equal(refreshView('settled', false, 0, translator(EN)).label, 'Refresh')
})

test('refreshView: 只有 loading 和 flash 两个视觉开关，idle/settled 都不转圈', () => {
  for (const phase of ['idle', 'settled'] as const) {
    assert.equal(refreshView(phase, false, 0, translator(EN)).spinning, false)
    assert.equal(refreshView(phase, false, 0, translator(EN)).flash, false)
  }
})

test('refreshView: 文案跟随语言，占位符不泄漏', () => {
  for (const [phase, flash, key] of [
    ['idle', false, 'cd.refresh'],
    ['loading', false, 'cd.refreshing'],
    ['settled', true, 'cd.refreshed'],
  ] as [RefreshPhase, boolean, keyof typeof EN][]) {
    assert.equal(refreshView(phase, flash, 0, translator(EN)).label, EN[key])
    assert.equal(refreshView(phase, flash, 0, translator(ZH)).label, ZH[key])
    assert.ok(!refreshView(phase, flash, 0, translator(ZH)).label.includes('cd.'))
  }
})

test('ageSeconds: 时钟回拨也不出负数', () => {
  assert.equal(ageSeconds(null, 1_000_000), 0)
  assert.equal(ageSeconds(1_000, 12_400), 11)
  assert.equal(ageSeconds(5_000, 4_000), 0)
})

test('REFRESH_CSS: 交互态、键盘焦点、动画键帧齐全', () => {
  for (const rule of [
    ':hover:not(:disabled)',
    ':active:not(:disabled)',
    '[data-pressed=' + String.fromCharCode(39) + 'true' + String.fromCharCode(39) + ']',
    ':focus-visible',
    '@keyframes cd-refresh-spin',
    '@keyframes cd-refresh-pop',
  ]) {
    assert.ok(REFRESH_CSS.includes(rule), `缺少规则：${rule}`)
  }
})

test('REFRESH_CSS: 动画尊重 prefers-reduced-motion 与 forced-colors', () => {
  assert.ok(REFRESH_CSS.includes('prefers-reduced-motion: reduce'))
  assert.ok(REFRESH_CSS.includes('forced-colors: active'))
  // 减弱动效时不再缩小按钮，但正在刷新仍要有进度感。
  const reduced = REFRESH_CSS.slice(REFRESH_CSS.indexOf('prefers-reduced-motion'))
  assert.ok(reduced.includes('transform: none'))
  assert.ok(reduced.includes('animation-duration'))
})

test('REFRESH_CSS: 每条规则都带作用域，不会碰到宿主自己的按钮', () => {
  const unscoped = REFRESH_CSS.split(String.fromCharCode(10))
    .filter((line) => line.includes('cd-refresh') && !line.includes('data-cd-scope') && !line.trimStart().startsWith('@'))
  assert.deepEqual(unscoped, [])
  assert.equal(REFRESH_STYLE_ID, 'context-doctor-refresh-css')
})

test('组件: 刷新按钮把四个状态钩子、作用域和样式表都接上了', () => {
  const source = readFileSync(join(root, 'src', 'client', 'ContextAuditRing.tsx'), 'utf8')
  for (const hook of [
    "data-pressed={pressed ? 'true' : 'false'}",
    'data-cd-spin={refreshState.spinning',
    'data-cd-flash={refreshState.flash',
    "disabled={state.state === 'loading'}",
    'onClick={() => refresh(true, true)}',
    'data-cd-scope={styleScope}',
    'tag.textContent = REFRESH_CSS',
    'onMouseDown={() => setPressed(true)}',
  ]) {
    assert.ok(source.includes(hook), `按钮缺少接线：${hook}`)
  }
  // 视觉状态必须来自纯函数，不能在组件里另起一套。
  assert.ok(source.includes("from './refresh.ts'"), '组件应从 refresh.ts 引入契约')
})

test('locale: 两个词典都带刷新文案', () => {
  const source = readFileSync(join(root, 'src', 'client', 'locales.ts'), 'utf8')
  for (const key of ['cd.refresh', 'cd.refreshing', 'cd.refreshed']) {
    assert.equal((source.match(new RegExp(`'${key}':`, 'g')) ?? []).length, 2, `${key} 应在 en/zh 各出现一次`)
  }
})

