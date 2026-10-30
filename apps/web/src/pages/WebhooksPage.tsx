import React, { useState } from 'react';
import {
  Webhook as WebhookIcon,
  Plus,
  Play,
  RotateCw,
  History,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Tag,
  Key,
  FolderTree,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatCard } from '../components/common/StatCard';
import { useI18n } from '../i18n/context';
import {
  useWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
} from '../hooks/api/use-webhooks';
import { WebhookFormDialog } from '../components/webhooks/WebhookFormDialog';
import { WebhookDeliveriesDialog } from '../components/webhooks/WebhookDeliveriesDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { copyToClipboard, formatDate } from '../lib/utils';
import type { Webhook, CreateWebhookPayload, UpdateWebhookPayload } from '../types';
import { toast } from 'sonner';

export const WebhooksPage: React.FC = () => {
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [selectedWebhookForDeliveries, setSelectedWebhookForDeliveries] = useState<Webhook | null>(null);
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: webhooks = [], isLoading, refetch, isRefetching } = useWebhooksQuery();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const testMutation = useTestWebhookMutation();

  const handleOpenCreate = () => {
    setEditingWebhook(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (wh: Webhook) => {
    setEditingWebhook(wh);
    setFormOpen(true);
  };

  const handleOpenDeliveries = (wh: Webhook) => {
    setSelectedWebhookForDeliveries(wh);
    setDeliveriesOpen(true);
  };

  const handleFormSubmit = async (payload: CreateWebhookPayload | UpdateWebhookPayload) => {
    if (editingWebhook) {
      await updateMutation.mutateAsync({ id: editingWebhook.id, payload });
      toast.success(t.common.success);
    } else {
      await createMutation.mutateAsync(payload as CreateWebhookPayload);
      toast.success(t.common.success);
    }
  };

  const handleToggleActive = async (wh: Webhook, current: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: wh.id,
        payload: { isActive: !current },
      });
      toast.success(t.common.success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (id: string) => {
    setWebhookToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!webhookToDelete) return;
    try {
      await deleteMutation.mutateAsync(webhookToDelete);
      toast.success(t.common.success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setWebhookToDelete(null);
    }
  };

  const handleTestPing = async (id: string) => {
    try {
      toast.info('Enviando ping de teste...');
      const res = await testMutation.mutateAsync(id);
      if (res.delivery.success) {
        toast.success(t.webhooks.testPingSuccess);
      } else {
        toast.error(`${t.webhooks.testPingFailed}: ${res.delivery.errorMessage || res.delivery.statusCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopyUrl = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      toast.success(t.common.copied);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Quick stats calculation
  const totalWebhooks = webhooks.length;
  const totalDeliveries = webhooks.reduce((acc, wh) => acc + (wh.stats?.totalDeliveries || 0), 0);
  const totalSuccessful = webhooks.reduce((acc, wh) => acc + (wh.stats?.successfulDeliveries || 0), 0);
  const successRate = totalDeliveries > 0 ? Math.round((totalSuccessful / totalDeliveries) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title={t.webhooks.title}
        subtitle={t.webhooks.subtitle}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 gap-1.5"
          >
            <RotateCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.common.refresh}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>{t.webhooks.addWebhook}</span>
          </Button>
        </div>
      </PageHeader>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.webhooks.quickStatsWebhooks}
          value={totalWebhooks}
          icon={WebhookIcon}
          iconClassName="text-primary"
          description={t.webhooks.quickStatsWebhooksDesc}
          isLoading={isLoading}
        />

        <StatCard
          title={t.webhooks.quickStatsDeliveries}
          value={totalDeliveries}
          icon={History}
          iconClassName="text-sky-500"
          description={t.webhooks.quickStatsDeliveriesDesc}
          isLoading={isLoading}
        />

        <StatCard
          title={t.webhooks.quickStatsSuccessRate}
          value={`${successRate}%`}
          icon={ShieldCheck}
          iconClassName="text-emerald-500"
          valueClassName={successRate >= 90 ? 'text-emerald-500' : successRate >= 70 ? 'text-amber-500' : 'text-destructive'}
          description={t.webhooks.quickStatsSuccessRateDesc}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Main Content: Webhooks List & Verification Guide */}
      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="endpoints" className="gap-2 text-xs">
            <WebhookIcon className="size-3.5" />
            Endpoints ({totalWebhooks})
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2 text-xs">
            <Code2 className="size-3.5" />
            {t.webhooks.integrationGuide}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Endpoints Table */}
        <TabsContent value="endpoints" className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <RotateCw className="size-6 animate-spin text-primary" />
              <p className="text-xs">{t.common.loading}</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-xl bg-muted/10 p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-3">
                <WebhookIcon className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.webhooks.noWebhooksFound}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Cadastre a URL do seu backend para receber alertas em tempo real sempre que clientes acessarem ou baixarem arquivos e links temporários.
              </p>
              <Button size="sm" onClick={handleOpenCreate} className="mt-4 gap-1.5 h-8">
                <Plus className="size-3.5" />
                {t.webhooks.addWebhook}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-border hover:shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Globe className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{wh.name}</h4>
                          <Badge
                            variant={wh.isActive ? 'default' : 'secondary'}
                            className="text-[10px] py-0 px-1.5"
                          >
                            {wh.isActive ? t.common.active : 'Pausado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                          <span className="truncate max-w-sm sm:max-w-md">{wh.url}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(wh.id, wh.url)}
                            className="hover:text-foreground p-0.5"
                            title={t.common.copy}
                          >
                            {copiedId === wh.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Switch
                        checked={wh.isActive}
                        onCheckedChange={(checked) => handleToggleActive(wh, wh.isActive)}
                        title={wh.isActive ? 'Desativar Webhook' : 'Ativar Webhook'}
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestPing(wh.id)}
                        disabled={testMutation.isPending}
                        className="h-8 px-2.5 text-xs gap-1.5"
                        title={t.webhooks.testPing}
                      >
                        <Play className="size-3 text-primary fill-primary" />
                        <span className="hidden md:inline">{t.webhooks.testPing}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDeliveries(wh)}
                        className="h-8 px-2.5 text-xs gap-1.5"
                        title={t.webhooks.viewDeliveries}
                      >
                        <History className="size-3.5 text-sky-500" />
                        <span className="hidden md:inline">{t.webhooks.viewDeliveries}</span>
                        {wh.stats?.totalDeliveries ? (
                          <span className="ml-1 px-1 py-0.2 rounded bg-muted text-[10px] font-mono">
                            {wh.stats.totalDeliveries}
                          </span>
                        ) : null}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(wh)}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-foreground"
                        title={t.webhooks.editWebhook}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(wh.id)}
                        className="h-8 size-8 p-0 text-destructive/80 hover:text-destructive"
                        title={t.common.delete}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Metadata Tags & Filters */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Tag className="size-3" /> Eventos:
                    </span>
                    {wh.events.map((ev) => (
                      <Badge key={ev} variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
                        {ev}
                      </Badge>
                    ))}

                    {wh.filterPrefix && (
                      <div className="flex items-center gap-1 ml-auto text-muted-foreground font-mono">
                        <FolderTree className="size-3" />
                        <span>Filtro: {wh.filterPrefix}*</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Integration Guide & Verification Code */}
        <TabsContent value="guide" className="space-y-4">
          <Card className="p-6 bg-card border-border/80">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500" />
              Como validar a assinatura HMAC no seu Backend
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Cada requisição de webhook enviada pelo EdgeKit Storage contém o cabeçalho <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">X-Edgekit-Signature</code> no formato <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">t=timestamp,v1=assinaturaHex</code>.
              Valide o segredo para garantir que a requisição veio com segurança do seu EdgeKit Worker e não sofreu ataques de replay.
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-1.5 font-mono">Node.js / Next.js / Express (TypeScript)</h4>
                <pre className="p-3.5 rounded-lg bg-muted/40 border border-border/80 text-[11px] font-mono overflow-x-auto text-foreground leading-relaxed">
{`import { verifyWebhookSignature } from './snippets/storage';

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('x-edgekit-signature') || '';
  const secret = process.env.EDGEKIT_WEBHOOK_SECRET!; // whsec_...

  const isValid = await verifyWebhookSignature({
    payload,
    signatureHeader: signature,
    secret,
    toleranceSeconds: 300, // 5 minutos
  });

  if (!isValid) {
    return new Response('Invalid webhook signature', { status: 401 });
  }

  const event = JSON.parse(payload);
  console.log('Evento recebido:', event.event);

  if (event.event === 'file.downloaded') {
    // Cliente baixou o arquivo! Registre no banco de pedidos:
    console.log('Arquivo baixado:', event.data.key, 'pelo IP:', event.data.request?.ip);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}`}
                </pre>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-foreground mb-1.5 font-mono">Python / FastAPI / Django</h4>
                <pre className="p-3.5 rounded-lg bg-muted/40 border border-border/80 text-[11px] font-mono overflow-x-auto text-foreground leading-relaxed">
{`from fastapi import FastAPI, Request, Header, HTTPException
from snippets.storage import verify_webhook_signature
import json

app = FastAPI()

@app.post("/webhooks/edgekit")
async def handle_webhook(request: Request, x_edgekit_signature: str = Header(None)):
    raw_body = (await request.body()).decode("utf-8")
    secret = "whsec_..."

    if not verify_webhook_signature(raw_body, x_edgekit_signature, secret):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(raw_body)
    if event["event"] == "file.downloaded":
        print(f"Download concluído: {event['data']['key']}")

    return {"received": True}`}
                </pre>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <WebhookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        webhookToEdit={editingWebhook}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <WebhookDeliveriesDialog
        webhook={selectedWebhookForDeliveries}
        open={deliveriesOpen}
        onOpenChange={setDeliveriesOpen}
      />

      <ConfirmDialog
        open={Boolean(webhookToDelete)}
        onOpenChange={(open) => {
          if (!open) setWebhookToDelete(null);
        }}
        title="Excluir Webhook"
        description={t.webhooks.deleteConfirm}
        confirmText="Excluir"
        cancelText={t.common.cancel}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
