import { Fragment } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { MoreHorizontal, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ALWAYS_VISIBLE_COMMAND_IDS,
  FORMAT_COMMANDS,
  TEXT_ALIGNMENTS,
  activeTextAlignment,
  setTextAlignment,
} from './commands'
import { LinkControl } from './LinkControl'

const VISIBLE_GROUP_STARTS = new Set(['link', 'h1', 'bullet'])
const OVERFLOW_GROUP_STARTS = new Set(['h3'])

export function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      Object.fromEntries(
        FORMAT_COMMANDS.map((command) => [command.id, command.isActive(instance)]),
      ),
  })
  const alignment = useEditorState({
    editor,
    selector: ({ editor: instance }) => activeTextAlignment(instance),
  })

  const visible = FORMAT_COMMANDS.filter((command) =>
    ALWAYS_VISIBLE_COMMAND_IDS.includes(command.id),
  )
  const overflow = FORMAT_COMMANDS.filter(
    (command) => !ALWAYS_VISIBLE_COMMAND_IDS.includes(command.id),
  )

  return (
    <div className="sticky top-0 z-10 border-b border-hairline bg-field/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[46rem] flex-wrap items-center gap-1 px-4 py-1.5 sm:px-8">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {visible.map((command) => (
        <Fragment key={command.id}>
          {VISIBLE_GROUP_STARTS.has(command.id) && (
            <Separator orientation="vertical" className="mx-1 h-5" />
          )}
          {command.id === 'link' ? (
            <LinkControl editor={editor} active={active[command.id] ?? false} size="sm" />
          ) : (
            <Toggle
              size="sm"
              pressed={active[command.id]}
              onPressedChange={() => command.run(editor)}
              aria-label={command.label}
            >
              <command.icon className="size-4" />
            </Toggle>
          )}
        </Fragment>
      ))}

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToggleGroup
        aria-label="Text alignment"
        value={[alignment]}
        onValueChange={([next]) => next && setTextAlignment(editor, next)}
      >
        {TEXT_ALIGNMENTS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label}>
            <Icon className="size-4" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="More formatting" />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {overflow.map((command) => (
              <Fragment key={command.id}>
                {OVERFLOW_GROUP_STARTS.has(command.id) && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => command.run(editor)}>
                  <command.icon className="mr-2 size-4" />
                  {command.label}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </div>
  )
}
