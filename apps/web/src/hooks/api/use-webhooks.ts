import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  fetchWebhookDeliveries,
  retryWebhookDelivery,
} from '../../services/api';
import type { CreateWebhookPayload, UpdateWebhookPayload } from '../../types';

export function useWebhooksQuery() {
  return useQuery({
    queryKey: queryKeys.webhooks.list(),
    queryFn: fetchWebhooks,
    staleTime: 1000 * 30, // 30s
  });
}

export function useWebhookDeliveriesQuery(webhookId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.webhooks.deliveries(webhookId),
    queryFn: () => fetchWebhookDeliveries(webhookId),
    enabled: Boolean(webhookId) && enabled,
    staleTime: 1000 * 10, // 10s
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWebhookPayload) => createWebhook(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebhookPayload }) =>
      updateWebhook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useTestWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testWebhook(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.deliveries(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list() });
    },
  });
}

export function useRetryWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ webhookId, deliveryId }: { webhookId: string; deliveryId: string }) =>
      retryWebhookDelivery(webhookId, deliveryId),
    onSuccess: (_, { webhookId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.deliveries(webhookId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list() });
    },
  });
}
