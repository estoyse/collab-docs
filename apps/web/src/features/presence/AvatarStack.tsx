import type { PresenceUser } from '@collab-docs/shared'
import { cn } from 'cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

function withCurrentUserFirst(users: PresenceUser[], currentUser: PresenceUser): PresenceUser[] {
  const self = users.find((user) => user.name === currentUser.name)
  const others = users.filter((user) => user !== self)

  return self ? [self, ...others] : others
}

export function AvatarStack({
  users,
  currentUser,
}: {
  users: PresenceUser[]
  currentUser: PresenceUser
}) {
  if (users.length === 0) {
    return null
  }

  const ordered = withCurrentUserFirst(users, currentUser)
  const visible = ordered.slice(0, MAX_VISIBLE)
  const hidden = ordered.length - visible.length
  const countLabel =
    ordered.length === 1 ? 'Only you are here' : `${ordered.length} people in this document`

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Active editors: ${countLabel}`}
        className="flex items-center -space-x-1.5 rounded-full p-0.5 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self aria-expanded:bg-hover"
      >
        {visible.map((user) => (
          <Tooltip key={user.name}>
            <TooltipTrigger
              render={<PresenceAvatar user={user} className="ring-2 ring-field" />}
            />
            <TooltipContent>{user.name}</TooltipContent>
          </Tooltip>
        ))}

        {hidden > 0 && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hover font-sans text-xs font-medium text-ink-muted ring-2 ring-field">
            +{hidden}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 gap-0 p-1">
        <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-ink-muted">
          {countLabel}
        </p>
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {ordered.map((user) => (
            <li key={user.name} className="flex items-center gap-2.5 rounded-sm px-2 py-1.5">
              <PresenceAvatar user={user} />
              <span className="min-w-0 truncate text-sm text-ink">{user.name}</span>
              {user.name === currentUser.name && (
                <span className="ml-auto shrink-0 text-xs font-medium text-self">You</span>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
