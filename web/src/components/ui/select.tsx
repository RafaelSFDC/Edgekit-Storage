import * as React from 'react';
import { Select as BaseSelect } from '@base-ui-components/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = BaseSelect.Root;
const SelectGroup = BaseSelect.Group;

export interface SelectValueProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Value>, 'children'> {
  placeholder?: string;
  children?: React.ReactNode | ((value: any) => React.ReactNode);
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder, children, ...props }, ref) => (
    <BaseSelect.Value ref={ref} {...props}>
      {(value) => {
        if (typeof children === 'function') {
          return children(value);
        }
        if (value) {
          return children || value;
        }
        return placeholder || children || null;
      }}
    </BaseSelect.Value>
  )
);
SelectValue.displayName = 'SelectValue';

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer [&>span]:line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <BaseSelect.Icon>
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
    </BaseSelect.Icon>
  </BaseSelect.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Portal>
    <BaseSelect.Positioner sideOffset={4} className="z-50">
      <BaseSelect.Popup
        ref={ref}
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1 animate-in fade-in-80',
          className
        )}
        {...props}
      >
        <BaseSelect.List>{children}</BaseSelect.List>
      </BaseSelect.Popup>
    </BaseSelect.Positioner>
  </BaseSelect.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Item>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseSelect.ItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </BaseSelect.ItemIndicator>
    </span>
    <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
  </BaseSelect.Item>
));
SelectItem.displayName = 'SelectItem';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};
