import type { Editor } from '@tiptap/core'
import type * as Y from 'yjs'
import { Download, FileCode, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { DOC_TITLE_KEY } from '@collab-docs/shared'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { downloadFile, printHtml } from '@/lib/download'
import { exportFileName, renderMarkdown, resolveExportTitle, standaloneHtml } from './exporters'

function currentTitle(editor: Editor, doc: Y.Doc): string {
  return resolveExportTitle(
    doc.getText(DOC_TITLE_KEY).toString(),
    editor.getText({ blockSeparator: '\n' }),
  )
}

export function ExportMenu({ editor, doc }: { editor: Editor; doc: Y.Doc }) {
  const exportHtml = () => {
    const title = currentTitle(editor, doc)

    try {
      downloadFile(
        standaloneHtml(title, editor.getHTML()),
        exportFileName(title, 'html'),
        'text/html;charset=utf-8',
      )
    } catch {
      toast.error('Could not export HTML')
    }
  }

  const exportMarkdown = async () => {
    const title = currentTitle(editor, doc)

    try {
      const markdown = await renderMarkdown(
        editor.extensionManager.baseExtensions,
        editor.getJSON(),
      )
      downloadFile(markdown, exportFileName(title, 'md'), 'text/markdown;charset=utf-8')
    } catch {
      toast.error('Could not export Markdown', {
        description: 'The exporter failed to load. Try again once you are back online.',
      })
    }
  }

  const exportPdf = () => {
    const title = currentTitle(editor, doc)

    try {
      printHtml(standaloneHtml(title, editor.getHTML()))
    } catch {
      toast.error('Could not open the print dialog')
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Export"
                  className="-mr-2 text-ink-muted hover:text-ink"
                />
              }
            >
              <Download />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="bottom">Export</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export as</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportPdf}>
            <Printer />
            PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportHtml}>
            <FileCode />
            HTML
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void exportMarkdown()}>
            <FileText />
            Markdown
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
