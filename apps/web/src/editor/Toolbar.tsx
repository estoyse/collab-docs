import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { MoreHorizontal, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { FORMAT_COMMANDS } from './commands'

const ALWAYS_VISIBLE = 5

export function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      Object.fromEntries(
        FORMAT_COMMANDS.map((command) => [command.id, command.isActive(instance)]),
      ),
  })

  const visible = FORMAT_COMMANDS.slice(0, ALWAYS_VISIBLE)
  const overflow = FORMAT_COMMANDS.slice(ALWAYS_VISIBLE)

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-hairline bg-field/85 px-3 py-1.5 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {visible.map((command) => (
        <Toggle
          key={command.id}
          size="sm"
          pressed={active[command.id]}
          onPressedChange={() => command.run(editor)}
          aria-label={command.label}
        >
          <command.icon className="size-4" />
        </Toggle>
      ))}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="More formatting" />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {overflow.map((command) => (
              <DropdownMenuItem key={command.id} onClick={() => command.run(editor)}>
                <command.icon className="mr-2 size-4" />
                {command.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
