import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) return trimmed
  return `https://${trimmed}`
}

export function LinkControl({
  editor,
  active,
  size = 'default',
  tooltipSide,
  popoverSide = 'bottom',
}: {
  editor: Editor
  active: boolean
  size?: 'default' | 'sm'
  tooltipSide?: 'right' | 'bottom' | 'top'
  popoverSide?: 'right' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (open) {
      setUrl(editor.getAttributes('link').href ?? '')
    }
  }, [open, editor])

  const applyLink = () => {
    const normalized = normalizeUrl(url)
    if (!normalized) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
    setOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  const trigger = (
    <PopoverTrigger render={<Toggle size={size} pressed={active} aria-label="Link" />}>
      <LinkIcon className="size-4" />
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {tooltipSide ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent side={tooltipSide}>Link</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverContent side={popoverSide} align="start" className="w-72 gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            applyLink()
          }}
        >
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste or type a link"
            aria-label="Link address"
            className="h-8"
          />
          <Button type="submit">{active ? 'Update' : 'Add link'}</Button>
        </form>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-ink-muted hover:text-danger"
            onClick={removeLink}
          >
            Remove link
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
