import type { PresenceUser } from '@collab-docs/shared'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MAX_VISIBLE = 4

function initials(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) {
    return '?'
  }

  return [...trimmed][0]!.toUpperCase()
}

export function AvatarStack({ users }: { users: PresenceUser[] }) {
  const visible = users.slice(0, MAX_VISIBLE)
  const hidden = users.length - visible.length

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user) => (
        <Tooltip key={user.name}>
          <TooltipTrigger
            render={
              <div
                title={user.name}
                className="flex size-7 shrink-0 items-center justify-center rounded-full font-sans text-xs font-medium text-page ring-2 ring-field"
                style={{ backgroundColor: user.color }}
              />
            }
          >
            {initials(user.name)}
          </TooltipTrigger>
          <TooltipContent>{user.name}</TooltipContent>
        </Tooltip>
      ))}

      {hidden > 0 && (
        <div
          title={users.slice(MAX_VISIBLE).map((user) => user.name).join(', ')}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hover font-sans text-xs font-medium text-ink-muted ring-2 ring-field"
        >
          +{hidden}
        </div>
      )}
    </div>
  )
}
