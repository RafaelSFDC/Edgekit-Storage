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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <KeyRound className="size-4" />
            <DialogTitle className="text-sm font-semibold">{t.signedModal.title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {t.signedModal.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Arquivo selecionado */}
          <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-2.5 border border-border/70">
            <span className="text-[11px] text-muted-foreground font-medium">Arquivo privado:</span>
            <span className="text-xs font-mono font-semibold text-foreground truncate" title={file?.key}>
              {file?.key}
            </span>
          </div>

          {/* Duração */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t.signedModal.durationLabel}</Label>
            <Select value={duration} onValueChange={(val) => setDuration(val ?? '3600')}>
              <SelectTrigger className="h-8 text-xs">
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
          </div>

          {/* Resultado do Link Assinado */}
          {signedResult && (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {t.signedModal.urlLabel}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {t.signedModal.expiresLabel}: {formatDate(signedResult.expiresAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={signedResult.url}
                  className="flex-1 h-8 px-2 rounded bg-background border border-border text-xs font-mono text-muted-foreground select-all outline-hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8 text-xs shrink-0 gap-1"
                >
                  <Copy className="size-3" />
                  <span>{t.common.copy}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  render={
                    <a href={signedResult.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  }
                  className="h-8 size-8 p-0 shrink-0"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {t.common.close}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={signedMutation.isPending}
            className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {signedMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
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
