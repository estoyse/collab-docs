import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-page px-3 text-sm text-ink transition-colors outline-none placeholder:text-ink-muted focus-visible:border-self focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-self/25 disabled:opacity-50 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
