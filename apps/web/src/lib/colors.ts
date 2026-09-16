export const PRESENCE_COLOR_COUNT = 8

export function colorForName(name: string): string {
  let hash = 0

  for (const character of name) {
    const cp = character.codePointAt(0) ?? 0
    hash = (hash ^ (cp * 0x9e3779b9)) | 0
  }

  return `var(--presence-${(Math.abs(hash) % PRESENCE_COLOR_COUNT) + 1})`
}
