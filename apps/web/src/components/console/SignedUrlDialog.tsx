import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  Clock,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogMedia,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useSignedUrlMutation } from '../../hooks/api/use-files';
import { useI18n } from '../../i18n/context';
import { copyToClipboard, formatDate } from '../../lib/utils';
import type { StorageObject } from '../../types';
import { toast } from 'sonner';

interface SignedUrlDialogProps {
  file: StorageObject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SignedUrlDialog: React.FC<SignedUrlDialogProps> = ({
  file,
  open,
  onOpenChange,
}) => {
  const { t } = useI18n();
  const [duration, setDuration] = useState<string>('3600');
  const [signedResult, setSignedResult] = useState<{
    url: string;
    expiresAt: string;
  } | null>(null);

  const signedMutation = useSignedUrlMutation();

  const handleGenerate = async () => {
    if (!file) return;

    try {
      const res = await signedMutation.mutateAsync({
        key: file.key,
        expiresInSeconds: Number(duration),
      });
      setSignedResult(res);
      toast.success('Link temporário assinado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar URL assinada.');
    }
  };

  const handleCopy = async () => {
    if (!signedResult) return;
    const ok = await copyToClipboard(signedResult.url);
    if (ok) {
      toast.success(t.common.copied);
    } else {
      toast.error(t.common.error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSignedResult(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent size="md" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <DialogMedia className="bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0">
              <KeyRound className="size-4" />
            </DialogMedia>
            <div>
              <DialogTitle>{t.signedModal.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {t.signedModal.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-4">
          {/* Arquivo selecionado */}
          <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-3 border border-border/70">
            <span className="text-[11px] text-muted-foreground font-medium">Arquivo privado:</span>
            <span className="text-xs font-mono font-semibold text-foreground truncate" title={file?.key}>
              {file?.key}
            </span>
          </div>

          {/* Duração */}
          <Field>
            <FieldLabel htmlFor="duration-select">{t.signedModal.durationLabel}</FieldLabel>
            <Select value={duration} onValueChange={(val) => setDuration(val ?? '3600')}>
              <SelectTrigger id="duration-select" className="w-full">
                <SelectValue placeholder="Selecione o tempo de expiração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="900">15 minutos</SelectItem>
                <SelectItem value="3600">1 hora (recomendado)</SelectItem>
                <SelectItem value="21600">6 horas</SelectItem>
                <SelectItem value="86400">24 horas (1 dia)</SelectItem>
                <SelectItem value="604800">7 dias (máximo)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Resultado do Link Assinado */}
          {signedResult && (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t.signedModal.urlLabel}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {t.signedModal.expiresLabel}: {formatDate(signedResult.expiresAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  value={signedResult.url}
                  className="font-mono text-xs select-all bg-background"
                />
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 gap-1"
                >
                  <Copy className="size-3.5" />
                  <span>{t.common.copy}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  render={
                    <a href={signedResult.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  }
                  className="shrink-0"
                />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter variant="default">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t.common.close}
          </Button>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={signedMutation.isPending}
            className="gap-1.5"
          >
            {signedMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t.signedModal.generating}</span>
              </>
            ) : (
              <span>{t.signedModal.generateButton}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
