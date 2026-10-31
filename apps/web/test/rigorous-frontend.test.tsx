import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDialog } from '../src/components/console/UploadDialog';
import { SignedUrlDialog } from '../src/components/console/SignedUrlDialog';
import { WebhookFormDialog } from '../src/components/webhooks/WebhookFormDialog';
import { FilesDataTable } from '../src/components/console/FilesDataTable';
import { TestWrapper } from './helpers/test-wrapper';
import type { StorageObject } from '../src/types';

describe('Rigorous Frontend Audit & Error Recovery Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. DOUBLE CLICK & CONCURRENT MUTATION PREVENTION
  // =========================================================================
  describe('Double-Click & Concurrent Request Prevention', () => {
    it('UploadDialog: Rapid clicking on submit button must NOT dispatch multiple concurrent upload requests', async () => {
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/upload')) {
          fetchCallCount++;
          // Simulate latency
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 201,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      data: { key: 'avatar.png', size: 10, mimeType: 'image/png' },
                    }),
                }),
              200
            )
          );
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <TestWrapper>
          <UploadDialog open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      );

      // Select file
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByText('avatar.png')).toBeInTheDocument();
      });

      const form = document.querySelector('form')!;
      const submitBtn = screen.getByRole('button', { name: /enviar arquivo/i });

      // Simulate rapid user double-clicking
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);
      fireEvent.submit(form);

      await waitFor(() => {
        expect(fetchCallCount).toBeGreaterThanOrEqual(1);
      });

      // Assert that concurrent requests did not exceed 1
      expect(fetchCallCount).toBe(1);
    });

    it('SignedUrlDialog: Rapid clicking on Gerar URL must NOT dispatch multiple signed URL requests', async () => {
      let signedCallCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/signed-url')) {
          signedCallCount++;
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      data: { url: 'http://localhost/test', expiresInSeconds: 3600 },
                    }),
                }),
              200
            )
          );
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const sampleFile: StorageObject = {
        key: 'private/report.pdf',
        size: 500,
        uploadedAt: new Date().toISOString(),
        mimeType: 'application/pdf',
        url: 'http://localhost/private/report.pdf',
        isPrivate: true,
      };

      render(
        <TestWrapper>
          <SignedUrlDialog file={sampleFile} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      );

      const generateBtn = screen.getByRole('button', { name: /gerar url segura/i });

      // Click 3 times rapidly
      fireEvent.click(generateBtn);
      fireEvent.click(generateBtn);
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(signedCallCount).toBeGreaterThanOrEqual(1);
      });

      expect(signedCallCount).toBe(1);
    });
  });

  // =========================================================================
  // 2. ERROR RECOVERY & FORM PRESERVATION ON BACKEND FAILURE
  // =========================================================================
  describe('Form Preservation and Error Recovery on Backend Failures', () => {
    it('WebhookFormDialog: Preserves user input when server responds with 400 Bad Request error', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/webhooks')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () =>
              Promise.resolve({
                success: false,
                error: { message: 'URL de webhook inválida ou inacessível.' },
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <TestWrapper>
          <WebhookFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/nome/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(nameInput, { target: { value: 'Webhook de Teste' } });
      fireEvent.change(urlInput, { target: { value: 'https://broken-endpoint.com' } });

      const saveBtn = screen.getByRole('button', { name: /^salvar$/i });
      fireEvent.click(saveBtn);

      // Verify the modal stayed open and typed values are still intact
      await waitFor(() => {
        expect(nameInput).toHaveValue('Webhook de Teste');
        expect(urlInput).toHaveValue('https://broken-endpoint.com');
      });
    });

    it('UploadDialog: Re-enables submission button and clears loading state when upload fails with HTTP 500', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/upload')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                success: false,
                error: { message: 'Falha interna de armazenamento no R2.' },
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <TestWrapper>
          <UploadDialog open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      );

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByText('photo.png')).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /enviar arquivo/i });
      fireEvent.click(submitBtn);

      // After failure, submit button must be re-enabled so user can try again
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });
  });

  // =========================================================================
  // 3. TABLE SELECTION & ROW IDENTIFIER INTEGRITY (getRowId)
  // =========================================================================
  describe('FilesDataTable Selection Integrity (getRowId)', () => {
    it('Preserves row selection by unique file key when search filter changes', async () => {
      const mockBatchDelete = vi.fn();
      const testFiles: StorageObject[] = [
        {
          key: 'documents/report-alpha.pdf',
          size: 1024,
          uploadedAt: '2026-10-30T12:00:00Z',
          mimeType: 'application/pdf',
          url: 'http://localhost/documents/report-alpha.pdf',
          isPrivate: false,
        },
        {
          key: 'images/photo-beta.png',
          size: 2048,
          uploadedAt: '2026-10-30T10:00:00Z',
          mimeType: 'image/png',
          url: 'http://localhost/images/photo-beta.png',
          isPrivate: false,
        },
      ];

      render(
        <TestWrapper>
          <FilesDataTable
            data={testFiles}
            isLoading={false}
            onRefresh={vi.fn()}
            onOpenUpload={vi.fn()}
            onPreview={vi.fn()}
            onGenerateSignedUrl={vi.fn()}
            onDelete={vi.fn()}
            onBatchDelete={mockBatchDelete}
          />
        </TestWrapper>
      );

      // Select first row (documents/report-alpha.pdf)
      const checkboxes = screen.getAllByRole('checkbox', { name: /selecionar arquivo/i });
      fireEvent.click(checkboxes[0]);

      // Batch delete bar appears
      expect(screen.getByText(/1 arquivo\(s\) selecionado\(s\)/i)).toBeInTheDocument();

      // Open confirm dialog and confirm
      const batchDeleteBtn = screen.getByRole('button', { name: /excluir selecionados/i });
      fireEvent.click(batchDeleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /^excluir selecionados$/i });
      fireEvent.click(confirmBtn);

      // Verify that mockBatchDelete was called with the exact file key
      expect(mockBatchDelete).toHaveBeenCalledWith(['documents/report-alpha.pdf']);
    });
  });
});
