import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'

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
}: {
  editor: Editor
  active: boolean
  size?: 'default' | 'sm'
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Toggle size={size} pressed={active} aria-label="Link" />}>
        <LinkIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            applyLink()
          }}
        >
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="h-7 text-sm"
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-ink-muted"
            onClick={removeLink}
          >
            Remove link
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
