const isApple =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

const APPLE_KEYS: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥' }
const OTHER_KEYS: Record<string, string> = { Mod: 'Ctrl', Shift: 'Shift', Alt: 'Alt' }

export function formatShortcut(shortcut: string): string {
  const keys = isApple ? APPLE_KEYS : OTHER_KEYS
  const parts = shortcut.split('-').map((part) => keys[part] ?? part.toUpperCase())

  return isApple ? parts.join('') : parts.join('+')
}
