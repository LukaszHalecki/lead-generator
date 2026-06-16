import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn('relative h-3 w-full overflow-hidden rounded-full bg-slate-100', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full transition-all duration-500"
        style={{
          width: `${value ?? 0}%`,
          backgroundColor:
            (value ?? 0) <= 20
              ? '#7f1d1d'
              : (value ?? 0) <= 40
                ? '#ef4444'
                : (value ?? 0) <= 60
                  ? '#f97316'
                  : (value ?? 0) <= 80
                    ? '#22c55e'
                    : '#059669',
        }}
      />
    </ProgressPrimitive.Root>
  )
}
