import type { PresenceUser } from '@collab-docs/shared'
import { cn } from 'cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PresenceEntry } from './usePresence'

const MAX_VISIBLE = 4

function initials(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) {
    return '?'
  }

  return [...trimmed][0]!.toUpperCase()
}

function PresenceAvatar({
  user,
  className,
  style,
  ...props
}: React.ComponentProps<'span'> & { user: PresenceUser }) {
  return (
    <span
      {...props}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full font-sans text-xs font-medium text-page',
        className,
      )}
      style={{ ...style, backgroundColor: user.color }}
    >
      {initials(user.name)}
    </span>
  )
}

function describeCount(users: PresenceEntry[]): string {
  if (users.length === 1 && users[0]!.isSelf) {
    return 'Only you are here'
  }

  return `${users.length} connected`
}

export function AvatarStack({
  users,
}: {
  users: PresenceEntry[]
}) {
  if (users.length === 0) {
    return null
  }

  const visible = users.slice(0, MAX_VISIBLE)
  const hidden = users.length - visible.length
  const countLabel = describeCount(users)

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Active editors: ${countLabel}`}
        className="flex items-center -space-x-2 rounded-full p-1 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self aria-expanded:bg-hover"
      >
        {visible.map((user) => (
          <Tooltip key={user.clientId}>
            <TooltipTrigger
              render={<PresenceAvatar user={user} className="ring-2 ring-field" />}
            />
            <TooltipContent>{user.isSelf ? `${user.name} (you)` : user.name}</TooltipContent>
          </Tooltip>
        ))}

        {hidden > 0 && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink/10 font-sans text-xs font-medium text-ink ring-2 ring-field">
            +{hidden}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 gap-0 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-ink-muted">{countLabel}</p>
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {users.map((user) => (
            <li key={user.clientId} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
              <PresenceAvatar user={user} />
              <span className="min-w-0 truncate text-sm text-ink">{user.name}</span>
              {user.isSelf && (
                <span className="ml-auto shrink-0 text-xs font-medium text-self">You</span>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
