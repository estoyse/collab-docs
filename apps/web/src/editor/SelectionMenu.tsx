import { BubbleMenu } from '@tiptap/react/menus'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { Toggle } from '@/components/ui/toggle'
import { FORMAT_COMMANDS, SELECTION_COMMAND_IDS } from './commands'
import { LinkControl } from './LinkControl'

const SELECTION_COMMANDS = FORMAT_COMMANDS.filter((command) =>
  SELECTION_COMMAND_IDS.includes(command.id),
)

export function SelectionMenu({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      Object.fromEntries(
        SELECTION_COMMANDS.map((command) => [command.id, command.isActive(instance)]),
      ),
  })

  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-0.5 rounded-md border border-hairline bg-page p-1 shadow-overlay">
        {SELECTION_COMMANDS.map((command) =>
          command.id === 'link' ? (
            <LinkControl
              key={command.id}
              editor={editor}
              active={active[command.id] ?? false}
              size="sm"
            />
          ) : (
            <Toggle
              key={command.id}
              size="sm"
              pressed={active[command.id]}
              onPressedChange={() => command.run(editor)}
              aria-label={command.label}
            >
              <command.icon />
            </Toggle>
          ),
        )}
      </div>
    </BubbleMenu>
  )
}
