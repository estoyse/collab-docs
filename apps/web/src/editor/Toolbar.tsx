import { Fragment, useEffect, useRef, useState, type ReactElement, type RefObject } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { MoreHorizontal, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatShortcut } from '@/lib/shortcuts'
import { useMediaQuery } from '@/lib/useMediaQuery'
import {
  ALWAYS_VISIBLE_COMMAND_IDS,
  FORMAT_COMMANDS,
  TEXT_ALIGNMENTS,
  activeTextAlignment,
  setTextAlignment,
  type TextAlignment,
} from './commands'
import { LinkControl } from './LinkControl'

const VISIBLE_GROUP_STARTS = new Set(['link', 'h1', 'bullet'])
const OVERFLOW_GROUP_STARTS = new Set(['h3'])

export const WIDE_LAYOUT_QUERY = '(min-width: 30rem)'

type TooltipSide = 'right' | 'bottom'

function ToolbarDivider() {
  return (
    <span
      aria-hidden
      className="mx-1 h-5 w-px shrink-0 bg-hairline xs:mx-auto xs:my-1 xs:h-px xs:w-5"
    />
  )
}

function ToolbarTooltip({
  label,
  shortcut,
  side,
  children,
}: {
  label: string
  shortcut?: string
  side: TooltipSide
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="flex items-center gap-2">
        {label}
        {shortcut && <span className="text-page/60">{formatShortcut(shortcut)}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

type OverflowEdges = { start: boolean; end: boolean }

function useOverflowEdges(ref: RefObject<HTMLElement | null>, enabled: boolean): OverflowEdges {
  const [edges, setEdges] = useState<OverflowEdges>({ start: false, end: false })

  useEffect(() => {
    const element = ref.current

    if (!element || !enabled) {
      return
    }

    const measure = () => {
      const maxScroll = element.scrollWidth - element.clientWidth
      setEdges({ start: element.scrollLeft > 1, end: element.scrollLeft < maxScroll - 1 })
    }

    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      element.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [ref, enabled])

  return enabled ? edges : { start: false, end: false }
}

const EDGE_MASKS: Record<string, string> = {
  none: '',
  start: '[mask-image:linear-gradient(to_right,transparent,black_2rem)]',
  end: '[mask-image:linear-gradient(to_left,transparent,black_2rem)]',
  both: '[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]',
}

function edgeMask({ start, end }: OverflowEdges): string {
  if (start && end) return EDGE_MASKS.both!
  if (start) return EDGE_MASKS.start!
  if (end) return EDGE_MASKS.end!
  return EDGE_MASKS.none!
}

export function Toolbar({ editor }: { editor: Editor }) {
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY)
  const side: TooltipSide = wide ? 'right' : 'bottom'
  const scroller = useRef<HTMLDivElement>(null)
  const edges = useOverflowEdges(scroller, !wide)

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
    <div className="sticky top-0 z-10 -mx-4 bg-field/90 py-2 backdrop-blur xs:top-6 xs:mx-0 xs:self-start xs:rounded-md xs:border xs:border-hairline xs:bg-page xs:p-1 xs:shadow-rail xs:backdrop-blur-none">
      <div
        ref={scroller}
        role="toolbar"
        aria-label="Formatting"
        aria-orientation={wide ? 'vertical' : 'horizontal'}
        className={`flex items-center gap-0.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xs:max-h-[calc(100vh-3.5rem)] xs:flex-col xs:overflow-x-visible xs:overflow-y-auto xs:px-0 ${edgeMask(edges)}`}
      >
        {wide && (
          <>
            <ToolbarTooltip label="Undo" shortcut="Mod-z" side={side}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                className="text-ink-muted hover:text-ink"
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Redo" shortcut="Mod-Shift-z" side={side}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                className="text-ink-muted hover:text-ink"
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 />
              </Button>
            </ToolbarTooltip>

            <ToolbarDivider />
          </>
        )}

        {visible.map((command) => (
          <Fragment key={command.id}>
            {VISIBLE_GROUP_STARTS.has(command.id) && <ToolbarDivider />}
            {command.id === 'link' ? (
              <LinkControl
                editor={editor}
                active={active[command.id] ?? false}
                size="sm"
                tooltipSide={side}
                popoverSide={wide ? 'right' : 'bottom'}
              />
            ) : (
              <ToolbarTooltip label={command.label} shortcut={command.shortcut} side={side}>
                <Toggle
                  size="sm"
                  pressed={active[command.id]}
                  onPressedChange={() => command.run(editor)}
                  aria-label={command.label}
                >
                  <command.icon className="size-4" />
                </Toggle>
              </ToolbarTooltip>
            )}
          </Fragment>
        ))}

        {wide && (
          <>
            <ToolbarDivider />
            <ToggleGroup
              aria-label="Text alignment"
              orientation="vertical"
              className="shrink-0 flex-col"
              value={[alignment]}
              onValueChange={([next]) => next && setTextAlignment(editor, next)}
            >
              {TEXT_ALIGNMENTS.map(({ value, label, icon: Icon, shortcut }) => (
                <ToolbarTooltip key={value} label={label} shortcut={shortcut} side={side}>
                  <ToggleGroupItem value={value} aria-label={label}>
                    <Icon className="size-4" />
                  </ToggleGroupItem>
                </ToolbarTooltip>
              ))}
            </ToggleGroup>
          </>
        )}

        <ToolbarDivider />
        <DropdownMenu>
          <ToolbarTooltip label="More formatting" side={side}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More formatting"
                  className="shrink-0 text-ink-muted hover:text-ink"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
          </ToolbarTooltip>
          <DropdownMenuContent side={wide ? 'right' : 'bottom'} align="start" className="w-56">
            {!wide && (
              <>
                <DropdownMenuItem onClick={() => editor.chain().focus().undo().run()}>
                  <Undo2 />
                  Undo
                  <DropdownMenuShortcut>{formatShortcut('Mod-z')}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().redo().run()}>
                  <Redo2 />
                  Redo
                  <DropdownMenuShortcut>{formatShortcut('Mod-Shift-z')}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {overflow.map((command, index) => (
              <Fragment key={command.id}>
                {index > 0 && OVERFLOW_GROUP_STARTS.has(command.id) && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => command.run(editor)}>
                  <command.icon />
                  {command.label}
                  {command.shortcut && (
                    <DropdownMenuShortcut>{formatShortcut(command.shortcut)}</DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              </Fragment>
            ))}
            {!wide && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Alignment</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={alignment}
                    onValueChange={(next: TextAlignment) => setTextAlignment(editor, next)}
                  >
                    {TEXT_ALIGNMENTS.map(({ value, label, icon: Icon }) => (
                      <DropdownMenuRadioItem key={value} value={value}>
                        <Icon />
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
