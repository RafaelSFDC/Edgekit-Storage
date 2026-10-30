import React, { useState } from 'react';
import {
  History,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '../../i18n/context';
import { useWebhookDeliveriesQuery, useRetryWebhookMutation } from '../../hooks/api/use-webhooks';
import { copyToClipboard, formatDate } from '../../lib/utils';
import type { Webhook, WebhookDelivery } from '../../types';
import { toast } from 'sonner';

interface WebhookDeliveriesDialogProps {
  webhook: Webhook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebhookDeliveriesDialog: React.FC<WebhookDeliveriesDialogProps> = ({
  webhook,
  open,
  onOpenChange,
}) => {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  const {
    data: deliveries = [],
    isLoading,
    refetch,
    isRefetching,
  } = useWebhookDeliveriesQuery(webhook?.id || '', open && Boolean(webhook?.id));

  const retryMutation = useRetryWebhookMutation();

  const handleCopyPayload = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedPayloadId(id);
      toast.success(t.common.copied);
      setTimeout(() => setCopiedPayloadId(null), 2000);
    }
  };

  const handleRetry = async (delivery: WebhookDelivery) => {
    if (!webhook) return;
    try {
      const res = await retryMutation.mutateAsync({
        webhookId: webhook.id,
        deliveryId: delivery.id,
      });
      if (res.delivery.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <History className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {t.webhooks.deliveriesTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {webhook ? `${webhook.name} • ${webhook.url}` : t.webhooks.deliveriesSubtitle}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-8 gap-1.5 shrink-0"
            >
              <RotateCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="text-xs">{t.common.refresh}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Deliveries List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">{t.common.loading}</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-lg bg-muted/10">
              <History className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs font-medium text-foreground">{t.webhooks.noDeliveriesFound}</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                Envie um ping de teste ou acesse arquivos protegidos para ver os logs de disparo aqui.
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const isExpanded = expandedId === delivery.id;
              let prettyPayload = delivery.payload;
              try {
                prettyPayload = JSON.stringify(JSON.parse(delivery.payload), null, 2);
              } catch {
                // keep as is
              }

              return (
                <div
                  key={delivery.id}
                  className="border border-border/80 rounded-lg overflow-hidden bg-card transition-colors hover:border-border"
                >
                  {/* Delivery Row Header */}
                  <div
                    onClick={() => toggleExpand(delivery.id)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 select-none gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        className="text-muted-foreground p-0.5"
                        aria-label="Expand"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>

                      {delivery.success ? (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] py-0 px-2 shrink-0">
                          <CheckCircle2 className="size-3" />
                          {delivery.statusCode || '200 OK'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/30 text-[11px] py-0 px-2 shrink-0">
                          <XCircle className="size-3" />
                          {delivery.statusCode ? `${delivery.statusCode} Error` : 'Failed'}
                        </Badge>
                      )}

                      <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5 shrink-0">
                        {delivery.eventType}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                        {formatDate(delivery.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="size-3" />
                        {delivery.durationMs}ms
                      </span>

                      {delivery.attempt > 1 && (
                        <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          Tentativa #{delivery.attempt}
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(delivery);
                        }}
                        disabled={retryMutation.isPending}
                        className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                        title={t.webhooks.retryDelivery}
                      >
                        <Send className="size-3" />
                        <span className="hidden sm:inline">{t.webhooks.retryDelivery}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-muted/20 p-4 space-y-3 text-xs">
                      {/* Error Banner if any */}
                      {delivery.errorMessage && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 flex items-start gap-2 text-destructive text-[11px]">
                          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Erro na chamada:</span> {delivery.errorMessage}
                          </div>
                        </div>
                      )}

                      {/* Request Payload */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-foreground text-[11px]">
                            {t.webhooks.payloadPreview}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(delivery.id, prettyPayload)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                          >
                            {copiedPayloadId === delivery.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            {t.common.copy}
                          </button>
                        </div>
                        <pre className="p-2.5 rounded bg-background border border-border/80 text-[11px] font-mono overflow-x-auto text-muted-foreground max-h-48 leading-relaxed">
                          {prettyPayload}
                        </pre>
                      </div>

                      {/* Server Response Body */}
                      {delivery.responseBody && (
                        <div>
                          <span className="font-medium text-foreground text-[11px] block mb-1.5">
                            {t.webhooks.responsePreview}
                          </span>
                          <pre className="p-2.5 rounded bg-background border border-border/80 text-[11px] font-mono overflow-x-auto text-muted-foreground max-h-36 leading-relaxed">
                            {delivery.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
