import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OverviewPage } from '../src/pages/OverviewPage';
import { RouterTestWrapper } from './helpers/test-wrapper';

describe('Frontend Overview & Stats Architecture Suite', () => {
  it('renders stats cards and shortcut links', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/files')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                objects: [
                  {
                    key: 'avatars/user.png',
                    size: 1024,
                    uploadedAt: '2026-10-30T10:00:00.000Z',
                    mimeType: 'image/png',
                    url: 'http://localhost/f/avatars/user.png',
                    isPrivate: false,
                  },
                  {
                    key: 'vault/secret.pdf',
                    size: 2048,
                    uploadedAt: '2026-10-30T10:00:00.000Z',
                    mimeType: 'application/pdf',
                    url: 'http://localhost/private/vault/secret.pdf',
                    isPrivate: true,
                  },
                ],
                truncated: false,
                cursor: null,
              },
            }),
        });
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { status: 'ok', service: 'cloudflare-storage' } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <RouterTestWrapper>
        <OverviewPage />
      </RouterTestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Explorador de Arquivos')).toBeInTheDocument();
      expect(screen.getByText('Exemplos de Código')).toBeInTheDocument();
    });
  });

  it('correctly paginates and aggregates files across batches in useStatsQuery when bucket exceeds 100 files', async () => {
    const page1Objects = Array.from({ length: 100 }, (_, i) => ({
      key: `folder${i % 5}/file_${i}.png`,
      size: 1000,
      uploadedAt: '2026-10-30T10:00:00.000Z',
      mimeType: 'image/png',
      url: `http://localhost/f/file_${i}.png`,
      isPrivate: false,
    }));

    const page2Objects = Array.from({ length: 50 }, (_, i) => ({
      key: `folder${i % 5}/extra_${i}.png`,
      size: 1000,
      uploadedAt: '2026-10-30T10:00:00.000Z',
      mimeType: 'image/png',
      url: `http://localhost/f/extra_${i}.png`,
      isPrivate: false,
    }));

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/files')) {
        const isPage2 = url.includes('cursor=page-2');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                objects: isPage2 ? page2Objects : page1Objects,
                truncated: !isPage2,
                cursor: isPage2 ? null : 'page-2',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { status: 'ok' } }),
      });
    });

    render(
      <RouterTestWrapper>
        <OverviewPage />
      </RouterTestWrapper>
    );

    // useStatsQuery paginates and aggregates all 150 files across batches
    await waitFor(() => {
      const totalCards = screen.getAllByText('150');
      expect(totalCards.length).toBeGreaterThan(0);
    });
  });
});
