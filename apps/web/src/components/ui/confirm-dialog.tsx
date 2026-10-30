"use client"

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /**
   * Elemento que abre a confirmação. Com `trigger`, o diálogo é uncontrolled e
   * o chamador não guarda `open` — confirmar/cancelar/Escape fecham sozinhos.
   * Sem `trigger`, o chamador controla (aberto de fora, ou carregando dado).
   */
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * ConfirmDialog
 *
 * Componente declarativo de alto nível sobre AlertDialog para confirmações
 * rápidas (destrutivas ou padrão), reduzindo a repetição de boilerplate no app.
 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
  icon,
  disabled = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      {...(open === undefined ? {} : { open, onOpenChange })}
    >
      {trigger ? <AlertDialogTrigger render={trigger} /> : null}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          {icon && <AlertDialogMedia>{icon}</AlertDialogMedia>}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              variant === "destructive" && buttonVariants({ variant: "destructive" })
            )}
            disabled={disabled}
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
