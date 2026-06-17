import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, className, id, ...props },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-sepia"
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={cn(
          'h-11 w-full rounded-md border bg-paper px-3 text-[15px] text-ink transition-colors placeholder:text-sepia/50 focus:outline-none focus:ring-2 focus:ring-trophy/30',
          error
            ? 'border-destructive focus:border-destructive'
            : 'border-rule-dark focus:border-trophy',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  )
})
