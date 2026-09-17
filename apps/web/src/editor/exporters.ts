import {
  flattenExtensions,
  type AnyExtension,
  type JSONContent,
  type MarkdownRendererHelpers,
} from '@tiptap/core'
import { DEFAULT_DOCUMENT_TITLE, resolveDocumentTitle } from '@collab-docs/shared'

const RESERVED_FILE_NAME_CHARACTERS = new Set('<>:"/\\|?*')
const MAX_FILE_NAME_LENGTH = 100

export function resolveExportTitle(title: string, bodyText: string): string {
  const firstBodyLine = bodyText
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  return resolveDocumentTitle(title, firstBodyLine ?? '')
}

export function exportFileName(title: string, extension: string): string {
  const base = [...title]
    .filter((character) => character >= ' ' && !RESERVED_FILE_NAME_CHARACTERS.has(character))
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .trim()

  return `${base || DEFAULT_DOCUMENT_TITLE}.${extension}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const STANDALONE_STYLES = `
  :root {
    --ink: #23272b;
    --ink-muted: #62696e;
    --hairline: rgb(35 39 43 / 0.11);
    --tint: rgb(35 39 43 / 0.06);
    --link: #2e5e86;
  }
  body {
    margin: 0;
    font-family: "Literata", Georgia, ui-serif, serif;
    font-size: 17px;
    line-height: 1.7;
    color: var(--ink);
    background: #fff;
  }
  main { max-width: 42rem; margin: 3.5rem auto; padding: 0 1.5rem; }
  main > * + * { margin-top: 0.75em; }
  main > :first-child { margin-top: 0; }
  p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre { margin-bottom: 0; }
  h1 { font-size: 2.5rem; line-height: 1.15; font-weight: 600; margin-top: 1.4em; }
  h2 { font-size: 1.75rem; line-height: 1.25; font-weight: 600; margin-top: 1.3em; }
  h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.2em; }
  ul, ol { padding-left: 1.4em; }
  li::marker { color: var(--ink-muted); }
  li > p { margin: 0; }
  blockquote { margin-left: 0; border-left: 2px solid var(--hairline); padding-left: 1em; color: var(--ink-muted); font-style: italic; }
  code { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace; font-size: 0.875em; background: var(--tint); border-radius: 4px; padding: 0.15em 0.35em; }
  pre { font-size: 0.875em; line-height: 1.5; background: #eceeed; border: 1px solid var(--hairline); border-radius: 6px; padding: 0.9em 1em; overflow-x: auto; white-space: pre-wrap; }
  pre code { font-size: 1em; background: none; padding: 0; border-radius: 0; }
  hr { border: none; border-top: 1px solid var(--hairline); margin: 1.6em 0; }
  a { color: var(--link); text-underline-offset: 2px; }
  @page { margin: 18mm 20mm; }
  @media print {
    main { max-width: none; margin: 0; padding: 0; }
    pre { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
  }
`

export function standaloneHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STANDALONE_STYLES}</style>
</head>
<body>
<main>${bodyHtml}</main>
</body>
</html>
`
}

function portableUnderlineOverride(extensions: AnyExtension[]): AnyExtension[] {
  const underline = flattenExtensions(extensions).find((extension) => extension.name === 'underline')

  if (!underline) {
    return []
  }

  return [
    underline.extend({
      priority: (underline.config.priority ?? 100) + 1,
      renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) => `<u>${helpers.renderChildren(node)}</u>`,
    }),
  ]
}

export async function renderMarkdown(
  baseExtensions: AnyExtension[],
  content: JSONContent,
): Promise<string> {
  const { MarkdownManager } = await import('@tiptap/markdown')
  const manager = new MarkdownManager({
    extensions: [...baseExtensions, ...portableUnderlineOverride(baseExtensions)],
  })

  return `${manager.serialize(content).trimEnd()}\n`
}
