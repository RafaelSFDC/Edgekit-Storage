import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilesDataTable } from '../src/components/console/FilesDataTable';
import { TestWrapper } from './helpers/test-wrapper';
import type { StorageObject } from '../src/types';

describe('Frontend FilesDataTable Component Suite', () => {
  const sampleFiles: StorageObject[] = [
    {
      key: 'photos/vacation.jpg',
      size: 1048576, // 1 MB
      uploadedAt: '2026-10-30T10:00:00.000Z',
      mimeType: 'image/jpeg',
      url: 'http://localhost:8787/f/photos/vacation.jpg',
      isPrivate: false,
    },
    {
      key: 'docs/contract.pdf',
      size: 2097152, // 2 MB
      uploadedAt: '2026-10-30T11:00:00.000Z',
      mimeType: 'application/pdf',
      url: 'http://localhost:8787/private/docs/contract.pdf',
      isPrivate: true,
    },
    {
      key: 'notes.txt',
      size: 512,
      uploadedAt: '2026-10-30T12:00:00.000Z',
      mimeType: 'text/plain',
      url: 'http://localhost:8787/f/notes.txt',
      isPrivate: false,
    },
  ];

  it('renders all file rows, badges and formatted sizes', () => {
    render(
      <TestWrapper>
        <FilesDataTable
          data={sampleFiles}
          isLoading={false}
          onRefresh={vi.fn()}
          onOpenUpload={vi.fn()}
          onPreview={vi.fn()}
          onGenerateSignedUrl={vi.fn()}
          onDelete={vi.fn()}
          onBatchDelete={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('vacation.jpg')).toBeInTheDocument();
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getAllByText(/Público|Public/i).length).toBe(2);
    expect(screen.getByText(/Privado|Private/i)).toBeInTheDocument();
  });

  it('filters rows dynamically using the search input', () => {
    render(
      <TestWrapper>
        <FilesDataTable
          data={sampleFiles}
          isLoading={false}
          onRefresh={vi.fn()}
          onOpenUpload={vi.fn()}
          onPreview={vi.fn()}
          onGenerateSignedUrl={vi.fn()}
          onDelete={vi.fn()}
          onBatchDelete={vi.fn()}
        />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/filtrar por nome/i);
    fireEvent.change(searchInput, { target: { value: 'vacation' } });

    expect(screen.getByText('vacation.jpg')).toBeInTheDocument();
    expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('handles row selection and displays batch delete action bar', async () => {
    const handleBatchDelete = vi.fn();

    render(
      <TestWrapper>
        <FilesDataTable
          data={sampleFiles}
          isLoading={false}
          onRefresh={vi.fn()}
          onOpenUpload={vi.fn()}
          onPreview={vi.fn()}
          onGenerateSignedUrl={vi.fn()}
          onDelete={vi.fn()}
          onBatchDelete={handleBatchDelete}
        />
      </TestWrapper>
    );

    const selectAllCheckbox = screen.getByLabelText(/selecionar todos os arquivos/i);
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/3 arquivo\(s\) selecionado\(s\)/i)).toBeInTheDocument();
    });

    const batchDeleteBtn = screen.getByRole('button', { name: /excluir selecionados/i });
    expect(batchDeleteBtn).toBeInTheDocument();
  });

  it('displays empty state when data array is empty', () => {
    const onOpenUpload = vi.fn();

    render(
      <TestWrapper>
        <FilesDataTable
          data={[]}
          isLoading={false}
          onRefresh={vi.fn()}
          onOpenUpload={onOpenUpload}
          onPreview={vi.fn()}
          onGenerateSignedUrl={vi.fn()}
          onDelete={vi.fn()}
          onBatchDelete={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/nenhum arquivo encontrado/i)).toBeInTheDocument();
    const uploadBtn = screen.getByRole('button', { name: /fazer primeiro upload/i });
    expect(uploadBtn).toBeInTheDocument();
    fireEvent.click(uploadBtn);
    expect(onOpenUpload).toHaveBeenCalledTimes(1);
  });
});
