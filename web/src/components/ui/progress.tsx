import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui-components/react';
import { cn } from '../../lib/utils';

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseProgress.Root>, 'value'> {
  value?: number | null;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <BaseProgress.Root
      ref={ref}
      value={value ?? 0}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <BaseProgress.Track className="h-full w-full">
        <BaseProgress.Indicator
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  )
);
Progress.displayName = 'Progress';

export { Progress };
