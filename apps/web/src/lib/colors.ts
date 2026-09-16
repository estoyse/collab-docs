export const PRESENCE_COLORS = [
  '#a15a55',
  '#996334',
  '#75762f',
  '#468154',
  '#008282',
  '#4475a6',
  '#7666a3',
  '#905d8c',
] as const

export const PRESENCE_COLOR_COUNT = PRESENCE_COLORS.length

export function colorForName(name: string): string {
  let hash = 0x811c9dc5

  for (const character of name) {
    const cp = character.codePointAt(0) ?? 0
    hash ^= cp
    hash = Math.imul(hash, 0x01000193)
  }

  hash = (hash ^ (hash >>> 15)) >>> 0

  return PRESENCE_COLORS[hash % PRESENCE_COLOR_COUNT]!
}
