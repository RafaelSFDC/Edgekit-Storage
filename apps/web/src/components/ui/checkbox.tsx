"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, "checked" | "onCheckedChange"> {
  checked?: boolean | "indeterminate"
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Checkbox({
  className,
  checked,
  indeterminate,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const isIndeterminate = indeterminate || checked === "indeterminate"
  const isChecked = isIndeterminate ? false : Boolean(checked)

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={isChecked}
      indeterminate={isIndeterminate}
      onCheckedChange={(newChecked) => {
        onCheckedChange?.(newChecked)
      }}
      className={cn(
        "peer group/checkbox relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:bg-input/30 dark:data-checked:bg-primary dark:data-indeterminate:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3.5 stroke-[2.5] group-data-indeterminate/checkbox:hidden" />
        <Minus className="size-3.5 stroke-[2.5] hidden group-data-indeterminate/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
