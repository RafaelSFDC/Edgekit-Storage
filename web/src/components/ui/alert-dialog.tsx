import * as React from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui-components/react';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

const AlertDialog = BaseAlertDialog.Root;
const AlertDialogTrigger = BaseAlertDialog.Trigger;
const AlertDialogPortal = BaseAlertDialog.Portal;

const AlertDialogBackdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Backdrop
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
      className
    )}
    {...props}
  />
));
AlertDialogBackdrop.displayName = 'AlertDialogBackdrop';

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogBackdrop />
    <BaseAlertDialog.Popup
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 rounded-lg text-foreground data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Popup>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-2',
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Close
    ref={ref}
    className={cn(buttonVariants({ variant: 'destructive', size: 'default' }), className)}
    {...props}
  />
));
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Close
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline', size: 'default' }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
