import * as React from 'react';
import { Menu as BaseMenu } from '@base-ui-components/react';
import { cn } from '../../lib/utils';

const DropdownMenu = BaseMenu.Root;
const DropdownMenuTrigger = BaseMenu.Trigger;
const DropdownMenuGroup = BaseMenu.Group;
const DropdownMenuPortal = BaseMenu.Portal;

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }
>(({ className, align = 'end', sideOffset = 4, children, ...props }, ref) => (
  <DropdownMenuPortal>
    <BaseMenu.Positioner sideOffset={sideOffset} align={align} className="z-50">
      <BaseMenu.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80',
          className
        )}
        {...props}
      >
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  </DropdownMenuPortal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <BaseMenu.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>
>(({ className, ...props }, ref) => (
  <BaseMenu.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <BaseMenu.GroupLabel
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
};
