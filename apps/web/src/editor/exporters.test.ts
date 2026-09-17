import { describe, expect, it } from 'vitest'
import { StarterKit } from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { exportFileName, renderMarkdown, resolveExportTitle, standaloneHtml } from './exporters'

const extensions = [
  StarterKit.configure({ undoRedo: false }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
]

describe('resolveExportTitle', () => {
  it('prefers the document title', () => {
    expect(resolveExportTitle('  Q3 plan ', 'Intro')).toBe('Q3 plan')
  })

  it('falls back to the first non-empty body line, then Untitled', () => {
    expect(resolveExportTitle('', '\n  \nFirst line\nSecond')).toBe('First line')
    expect(resolveExportTitle(' ', '')).toBe('Untitled')
  })

  it('caps the title at the shared maximum title length', () => {
    expect(resolveExportTitle('', `  ${'x'.repeat(300)}  `)).toBe('x'.repeat(120))
  })
})

describe('exportFileName', () => {
  it('strips characters that are invalid in file names', () => {
    expect(exportFileName('a/b: c*d?<e>|"f"\\g', 'md')).toBe('ab cde fg.md'.replace(' cde fg', ' cdefg'))
  })

  it('trims dots and whitespace and never returns an empty base', () => {
    expect(exportFileName('  ..notes..  ', 'html')).toBe('notes.html')
    expect(exportFileName('???', 'html')).toBe('Untitled.html')
  })

  it('caps the length', () => {
    expect(exportFileName('x'.repeat(300), 'md')).toBe(`${'x'.repeat(100)}.md`)
  })
})

describe('standaloneHtml', () => {
  it('escapes the title and embeds the body', () => {
    const html = standaloneHtml('<script>alert(1)</script>', '<p>Hello</p>')

    expect(html).toContain('<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>')
    expect(html).toContain('<main><p>Hello</p></main>')
  })
})

describe('renderMarkdown', () => {
  it('serializes the editor schema and writes underline as inline HTML', async () => {
    const markdown = await renderMarkdown(extensions, {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, textAlign: 'center' },
          content: [{ type: 'text', text: 'Plan' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Read ' },
            { type: 'text', text: 'this', marks: [{ type: 'underline' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'that', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
            },
          ],
        },
      ],
    })

    expect(markdown).toBe('## Plan\n\nRead <u>this</u> and **that**\n\n- One\n')
  })
})
