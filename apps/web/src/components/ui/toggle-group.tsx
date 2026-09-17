import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cn } from "cn"
import { Toggle } from "@/components/ui/toggle"

function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        "inline-flex items-center gap-px rounded-md bg-hover p-0.5 data-vertical:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof Toggle>) {
  return (
    <Toggle
      data-slot="toggle-group-item"
      className={cn(
        "h-6 min-w-6 rounded-sm px-1.5 hover:bg-page/70 aria-pressed:bg-page aria-pressed:text-ink aria-pressed:shadow-rail data-[pressed]:bg-page data-[pressed]:text-ink data-[pressed]:shadow-rail",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
