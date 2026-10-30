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
  DialogBody,
  DialogFooter,
  DialogMedia,
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
      <DialogContent size="3xl" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <DialogMedia className="size-10 mb-0">
                <History className="size-5" />
              </DialogMedia>
              <div>
                <DialogTitle>
                  {t.webhooks.deliveriesTitle}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {webhook ? `${webhook.name} • ${webhook.url}` : t.webhooks.deliveriesSubtitle}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5 shrink-0"
            >
              <RotateCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>{t.common.refresh}</span>
            </Button>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">{t.common.loading}</span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-2">
              <Send className="size-8 opacity-40 mb-1" />
              <p className="text-xs font-medium text-foreground">{t.webhooks.noDeliveriesFound}</p>
              <p className="text-[11px] max-w-sm">
                Quando arquivos forem adicionados, baixados ou excluídos, os envios de webhook aparecerão aqui com status e logs.
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const isExpanded = expandedId === delivery.id;
              let prettyPayload = delivery.payload;
              try {
                prettyPayload = JSON.stringify(JSON.parse(delivery.payload), null, 2);
              } catch {
                // Keep raw if not json
              }

              return (
                <div
                  key={delivery.id}
                  className="rounded-lg border border-border/70 bg-card overflow-hidden text-xs transition-colors"
                >
                  {/* Delivery Row Header */}
                  <div
                    onClick={() => toggleExpand(delivery.id)}
                    className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </button>

                      <Badge
                        variant="outline"
                        className={`font-mono text-[11px] gap-1 shrink-0 ${
                          delivery.success
                            ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                            : 'border-rose-500/30 text-rose-600 bg-rose-500/10'
                        }`}
                      >
                        {delivery.success ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        <span>{delivery.statusCode || 'ERR'}</span>
                      </Badge>

                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {delivery.eventType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {delivery.durationMs}ms
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(delivery.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(delivery);
                        }}
                        disabled={retryMutation.isPending}
                        className="h-7 px-2 gap-1 text-[11px]"
                      >
                        <RotateCw className="size-3" />
                        <span>{t.webhooks.retryDelivery}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Delivery Row Body (Expanded) */}
                  {isExpanded && (
                    <div className="p-3 border-t border-border/60 bg-muted/20 space-y-3">
                      {delivery.errorMessage && (
                        <div className="flex items-start gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                          <span className="font-mono break-all">{delivery.errorMessage}</span>
                        </div>
                      )}

                      {/* Request Payload */}
                      <div>
                        <div className="flex items-center justify-between pb-1.5">
                          <span className="font-medium text-foreground text-[11px]">
                            {t.webhooks.payloadPreview}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(delivery.id, prettyPayload)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
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
        </DialogBody>

        <DialogFooter variant="default">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
