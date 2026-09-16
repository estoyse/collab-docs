export const PRESENCE_COLORS = [
  '#c8635d',
  '#be7125',
  '#8b8c14',
  '#429c5a',
  '#009d9e',
  '#418ad1',
  '#8c74cc',
  '#b167ab',
] as const

export const PRESENCE_COLOR_COUNT = PRESENCE_COLORS.length

export function colorForName(name: string): string {
  let hash = 0

  for (const character of name) {
    const cp = character.codePointAt(0) ?? 0
    hash = (hash ^ (cp * 0x9e3779b9)) | 0
  }

  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLOR_COUNT]!
}
