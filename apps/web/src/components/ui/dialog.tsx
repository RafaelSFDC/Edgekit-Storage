"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const dialogSizeClasses = {
  xs: "max-w-[calc(100%-2rem)] sm:max-w-xs",
  sm: "max-w-[calc(100%-2rem)] sm:max-w-sm",
  default: "max-w-[calc(100%-2rem)] sm:max-w-sm",
  md: "max-w-[calc(100%-2rem)] sm:max-w-md",
  lg: "max-w-[calc(100%-2rem)] sm:max-w-lg",
  xl: "max-w-[calc(100%-2rem)] sm:max-w-xl",
  "2xl": "max-w-[calc(100%-2rem)] sm:max-w-2xl",
  "3xl": "max-w-[calc(100%-2rem)] sm:max-w-3xl",
  "4xl": "max-w-[calc(100%-2rem)] sm:max-w-4xl",
  "5xl": "w-[92%] max-w-5xl",
  full: "w-[calc(100vw-1.5rem)] h-[calc(100vh-1.5rem)] sm:w-[calc(100vw-3rem)] sm:h-[calc(100vh-3rem)] max-w-none max-h-none",
  viewport: "w-screen h-screen max-w-none max-h-none rounded-none inset-0 translate-x-0 translate-y-0 top-0 left-0",
} as const

export type DialogSize = keyof typeof dialogSizeClasses

function DialogContent({
  className,
  children,
  size = "sm",
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  size?: DialogSize
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          dialogSizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-media"
      className={cn(
        "mb-1 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0",
        className
      )}
      {...props}
    />
  )
}

function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 overflow-y-auto px-4 py-2 min-h-0",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  variant = "inset",
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "inset" | "bare"
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        variant === "inset" && "-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4",
        variant === "default" && "border-t border-border bg-muted/30 px-5 py-3.5",
        variant === "bare" && "pt-2",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogMedia,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
