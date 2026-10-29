import * as React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui-components/react';
import { cn } from '../../lib/utils';

const TooltipProvider = BaseTooltip.Provider;
const Tooltip = BaseTooltip.Root;
const TooltipTrigger = BaseTooltip.Trigger;

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>
>(({ className, ...props }, ref) => (
  <BaseTooltip.Portal>
    <BaseTooltip.Positioner sideOffset={6} className="z-50">
      <BaseTooltip.Popup
        ref={ref}
        className={cn(
          'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      />
    </BaseTooltip.Positioner>
  </BaseTooltip.Portal>
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
