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
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[checked]:bg-primary data-[checked]:text-primary-foreground flex items-center justify-center cursor-pointer transition-colors',
      className
    )}
    {...props}
  >
    <BaseCheckbox.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
