/**
 * キーボードショートカットを抑制すべき「入力中」の要素かどうかを判定する。
 *
 * true を返すケース:
 *  - INPUT / TEXTAREA タグ
 *  - contentEditable な要素（リッチテキストエディタ等）
 *  - role="textbox" / role="combobox"
 *  - data-prevent-hotkeys="true" を持つ祖先がある要素
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;

  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'combobox') return true;

  if (target.closest('[data-prevent-hotkeys="true"]')) return true;

  return false;
}
