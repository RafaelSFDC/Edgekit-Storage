import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebhookFormDialog } from '../src/components/webhooks/WebhookFormDialog';
import { WebhookDeliveriesDialog } from '../src/components/webhooks/WebhookDeliveriesDialog';
import { TestWrapper } from './helpers/test-wrapper';
import type { Webhook } from '../src/types';

describe('Frontend Webhooks Dialogs Suite', () => {
  const sampleWebhook: Webhook = {
    id: 'wh_12345',
    name: 'Order Notifications',
    url: 'https://myshop.com/webhook',
    secret: 'whsec_abcdef1234567890',
    events: ['*'],
    filterPrefix: 'orders/',
    isActive: true,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  };

  it('WebhookFormDialog populates existing webhook data in edit mode', () => {
    render(
      <TestWrapper>
        <WebhookFormDialog
          open={true}
          onOpenChange={vi.fn()}
          webhookToEdit={sampleWebhook}
          onSubmit={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByDisplayValue('Order Notifications')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://myshop.com/webhook')).toBeInTheDocument();
    expect(screen.getByDisplayValue('whsec_abcdef1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('orders/')).toBeInTheDocument();
  });

  it('WebhookFormDialog validates URL protocol on submission', async () => {
    const handleSubmit = vi.fn();

    render(
      <TestWrapper>
        <WebhookFormDialog
          open={true}
          onOpenChange={vi.fn()}
          onSubmit={handleSubmit}
        />
      </TestWrapper>
    );

    const nameInput = screen.getByPlaceholderText(/Ex: Backend da Loja/i);
    const urlInput = screen.getByPlaceholderText(/https:\/\/seu-backend\.com/i);

    fireEvent.change(nameInput, { target: { value: 'Bad URL Hook' } });
    fireEvent.change(urlInput, { target: { value: 'ftp://insecure.com' } });

    const submitBtn = screen.getByRole('button', { name: /salvar|save/i });
    fireEvent.click(submitBtn);

    // handleSubmit should NOT be called due to invalid protocol
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('WebhookDeliveriesDialog displays deliveries and supports expansion', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/deliveries')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                deliveries: [
                  {
                    id: 'del_1',
                    webhookId: sampleWebhook.id,
                    eventId: 'evt_1',
                    eventType: 'file.uploaded',
                    payload: '{"key":"photos/pic.jpg"}',
                    statusCode: 200,
                    responseBody: '{"ok":true}',
                    durationMs: 42,
                    success: true,
                    attempt: 1,
                    createdAt: '2026-10-30T10:05:00.000Z',
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <TestWrapper>
        <WebhookDeliveriesDialog
          webhook={sampleWebhook}
          open={true}
          onOpenChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('file.uploaded')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('42ms')).toBeInTheDocument();
    });

    const row = screen.getByText('file.uploaded');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText(/"key": "photos\/pic.jpg"/)).toBeInTheDocument();
    });
  });
});
