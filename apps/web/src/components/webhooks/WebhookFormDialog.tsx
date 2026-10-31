import React, { useState, useEffect } from 'react';
import {
  Webhook as WebhookIcon,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Tag,
  Key,
  FolderTree,
  Loader2,
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
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '../../i18n/context';
import { copyToClipboard } from '../../lib/utils';
import type { Webhook, CreateWebhookPayload, UpdateWebhookPayload } from '../../types';
import { toast } from 'sonner';

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookToEdit?: Webhook | null;
  onSubmit: (payload: CreateWebhookPayload | UpdateWebhookPayload) => Promise<void>;
  isLoading?: boolean;
}

function generateLocalSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return `whsec_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const AVAILABLE_EVENTS = [
  { id: 'file.uploaded', labelKey: 'eventUploaded' as const },
  { id: 'file.downloaded', labelKey: 'eventDownloaded' as const },
  { id: 'file.deleted', labelKey: 'eventDeleted' as const },
];

export const WebhookFormDialog: React.FC<WebhookFormDialogProps> = ({
  open,
  onOpenChange,
  webhookToEdit,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['*']);
  const [filterPrefix, setFilterPrefix] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (open) {
      if (webhookToEdit) {
        setName(webhookToEdit.name);
        setUrl(webhookToEdit.url);
        setSecret(webhookToEdit.secret);
        setSelectedEvents(webhookToEdit.events || ['*']);
        setFilterPrefix(webhookToEdit.filterPrefix || '');
        setIsActive(webhookToEdit.isActive);
      } else {
        setName('');
        setUrl('');
        setSecret(generateLocalSecret());
        setSelectedEvents(['*']);
        setFilterPrefix('');
        setIsActive(true);
      }
      setCopiedSecret(false);
    }
  }, [open, webhookToEdit]);

  const handleCopySecret = async () => {
    if (!secret) return;
    const ok = await copyToClipboard(secret);
    if (ok) {
      setCopiedSecret(true);
      toast.success(t.common.copied);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleRegenerateSecret = () => {
    setSecret(generateLocalSecret());
    setCopiedSecret(false);
  };

  const handleToggleAllEvents = () => {
    if (selectedEvents.includes('*')) {
      setSelectedEvents(['file.downloaded']);
    } else {
      setSelectedEvents(['*']);
    }
  };

  const handleToggleEvent = (eventId: string) => {
    if (selectedEvents.includes('*')) {
      // Transitioning from all to specific
      const remaining = AVAILABLE_EVENTS.map((e) => e.id).filter((id) => id !== eventId);
      setSelectedEvents(remaining);
      return;
    }

    if (selectedEvents.includes(eventId)) {
      const next = selectedEvents.filter((e) => e !== eventId);
      setSelectedEvents(next.length === 0 ? ['file.downloaded'] : next);
    } else {
      const next = [...selectedEvents, eventId];
      if (next.length === AVAILABLE_EVENTS.length) {
        setSelectedEvents(['*']);
      } else {
        setSelectedEvents(next);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      toast.error(`${t.webhooks.urlLabel}: HTTP / HTTPS required`);
      return;
    }

    if (!name.trim()) {
      toast.error(`${t.webhooks.nameLabel} is required`);
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        url: cleanUrl,
        secret: secret.trim(),
        events: selectedEvents,
        filterPrefix: filterPrefix.trim() || null,
        isActive,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const isEditing = Boolean(webhookToEdit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <DialogMedia className="mb-0">
              <WebhookIcon className="size-4" />
            </DialogMedia>
            <div>
              <DialogTitle>
                {isEditing ? t.webhooks.editWebhook : t.webhooks.addWebhook}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {t.webhooks.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="p-6 space-y-4">
            <FieldGroup>
              {/* Friendly Name */}
              <Field>
                <FieldLabel htmlFor="webhook-name" className="text-xs font-medium flex items-center gap-1.5">
                  <Tag className="size-3.5 text-muted-foreground" />
                  {t.webhooks.nameLabel}
                </FieldLabel>
                <Input
                  id="webhook-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.webhooks.namePlaceholder}
                  className="h-9 text-xs"
                />
              </Field>

              {/* Endpoint URL */}
              <Field>
                <FieldLabel htmlFor="webhook-url" className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  {t.webhooks.urlLabel}
                </FieldLabel>
                <Input
                  id="webhook-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.webhooks.urlPlaceholder}
                  className="h-9 text-xs font-mono"
                />
              </Field>

              {/* Secret Signing Key */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="webhook-secret" className="text-xs font-medium flex items-center gap-1.5">
                    <Key className="size-3.5 text-muted-foreground" />
                    {t.webhooks.secretLabel}
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={handleRegenerateSecret}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="size-3" />
                    {t.webhooks.generateSecret}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="webhook-secret"
                    type="text"
                    required
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="h-9 text-xs font-mono bg-muted/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={handleCopySecret}
                  >
                    {copiedSecret ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </Field>

              {/* Subscribed Events */}
              <Field>
                <FieldLabel className="text-xs font-medium">
                  {t.webhooks.eventsLabel}
                </FieldLabel>
                <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-2">
                  {/* Wildcard * */}
                  <label className="flex items-center justify-between cursor-pointer py-1 text-xs font-medium text-foreground">
                    <span>{t.webhooks.allEvents}</span>
                    <Checkbox
                      checked={selectedEvents.includes('*')}
                      onCheckedChange={handleToggleAllEvents}
                    />
                  </label>

                  <div className="border-t border-border/40 my-1 pt-1 space-y-1.5">
                    {AVAILABLE_EVENTS.map((event) => {
                      const isChecked = selectedEvents.includes('*') || selectedEvents.includes(event.id);
                      return (
                        <label
                          key={event.id}
                          className="flex items-center justify-between cursor-pointer py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="font-mono text-[11px]">{t.webhooks[event.labelKey]}</span>
                          <Checkbox
                            checked={isChecked}
                            disabled={selectedEvents.includes('*')}
                            onCheckedChange={() => handleToggleEvent(event.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </Field>

              {/* Folder Prefix Filter */}
              <Field>
                <FieldLabel htmlFor="webhook-prefix" className="text-xs font-medium flex items-center gap-1.5">
                  <FolderTree className="size-3.5 text-muted-foreground" />
                  {t.webhooks.prefixLabel}
                </FieldLabel>
                <Input
                  id="webhook-prefix"
                  type="text"
                  value={filterPrefix}
                  onChange={(e) => setFilterPrefix(e.target.value)}
                  placeholder={t.webhooks.prefixPlaceholder}
                  className="h-9 text-xs font-mono"
                />
                <FieldDescription className="text-[11px]">
                  {t.webhooks.prefixHelp}
                </FieldDescription>
              </Field>

              {/* Active Switch */}
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="webhook-active" className="text-xs font-medium text-foreground cursor-pointer">
                    {t.webhooks.activeLabel}
                  </FieldLabel>
                  <FieldDescription className="text-[11px]">
                    {isActive ? t.common.active : 'Pausado'}
                  </FieldDescription>
                </div>
                <Switch id="webhook-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </FieldGroup>
          </DialogBody>

          <DialogFooter variant="default">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
