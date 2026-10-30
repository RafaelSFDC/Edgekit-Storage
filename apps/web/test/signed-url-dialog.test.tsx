import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignedUrlDialog } from '../src/components/console/SignedUrlDialog';
import { TestWrapper } from './helpers/test-wrapper';
import type { StorageObject } from '../src/types';

describe('Frontend SignedUrlDialog Component Suite', () => {
  const samplePrivateFile: StorageObject = {
    key: 'private/vault/financial_report.pdf',
    size: 2048,
    uploadedAt: '2026-10-30T10:00:00.000Z',
    mimeType: 'application/pdf',
    url: 'http://localhost:8787/private/vault/financial_report.pdf',
    isPrivate: true,
  };

  it('renders modal with target file name and duration selector', () => {
    render(
      <TestWrapper>
        <SignedUrlDialog
          file={samplePrivateFile}
          open={true}
          onOpenChange={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /gerar link com acesso tempor/i })).toBeInTheDocument();
    expect(screen.getByText('private/vault/financial_report.pdf')).toBeInTheDocument();
    expect(screen.getByText(/tempo de validade/i)).toBeInTheDocument();
  });

  it('calls generateSignedUrl API when Gerar URL Segura button is clicked', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/signed-url')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                url: 'http://localhost:8787/private/vault/financial_report.pdf?token=abc&expires=1730000000',
                key: 'private/vault/financial_report.pdf',
                expiresAt: 1730000000,
                expiresInSeconds: 3600,
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <TestWrapper>
        <SignedUrlDialog
          file={samplePrivateFile}
          open={true}
          onOpenChange={vi.fn()}
        />
      </TestWrapper>
    );

    const generateBtn = screen.getByRole('button', { name: /gerar url segura/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/token=abc/)).toBeInTheDocument();
    });
  });
});
