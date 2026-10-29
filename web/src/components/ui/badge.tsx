import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-orange-500/10 text-orange-400 border border-orange-500/20',
        secondary:
          'border-transparent bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
        destructive:
          'border-transparent bg-red-950/50 text-red-300 border border-red-800/60',
        outline:
          'border-zinc-800 text-zinc-300 bg-zinc-950/60',
        success:
          'border-transparent bg-emerald-950/50 text-emerald-300 border border-emerald-800/60',
        warning:
          'border-transparent bg-amber-500/10 text-amber-300 border border-amber-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
