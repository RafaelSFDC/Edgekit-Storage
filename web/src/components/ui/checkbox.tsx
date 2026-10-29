import * as React from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui-components/react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>
>(({ className, ...props }, ref) => (
  <BaseCheckbox.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded border border-zinc-700 bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-orange-600 data-[checked]:border-orange-600 data-[checked]:text-white flex items-center justify-center cursor-pointer transition-colors',
      className
    )}
    {...props}
  >
    <BaseCheckbox.Indicator className="flex items-center justify-center text-white">
      <Check className="h-3 w-3" strokeWidth={3} />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
