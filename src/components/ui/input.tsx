import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, suffix, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-input bg-background text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        {prefix && <div className="pl-3 text-muted-foreground shrink-0">{prefix}</div>}
        <input
          type={type}
          className={cn(
            'flex-1 h-full bg-transparent px-3 py-2 placeholder:text-muted-foreground outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium'
          )}
          ref={ref}
          {...props}
        />
        {suffix && <div className="pr-3 text-muted-foreground shrink-0">{suffix}</div>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
