import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDialog } from '../src/components/console/UploadDialog';
import { TestWrapper } from './helpers/test-wrapper';

describe('Frontend UploadDialog Component Suite', () => {
  it('renders upload modal with inputs and controls when open is true', () => {
    render(
      <TestWrapper>
        <UploadDialog open={true} onOpenChange={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /upload de arquivos/i })).toBeInTheDocument();
    expect(screen.getByText(/pasta de destino/i)).toBeInTheDocument();
    expect(screen.getByText(/tornar arquivo privado/i)).toBeInTheDocument();
    expect(screen.getByText(/manter nome original/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /enviar arquivo/i });
    expect(submitBtn).toBeDisabled();
  });

  it('updates form fields and enables submission when a file is selected', async () => {
    render(
      <TestWrapper>
        <UploadDialog open={true} onOpenChange={vi.fn()} />
      </TestWrapper>
    );

    const folderInput = screen.getByPlaceholderText(/ex: avatares/i);
    fireEvent.change(folderInput, { target: { value: 'my-folder' } });
    expect(folderInput).toHaveValue('my-folder');

    const file = new File(['content'], 'avatar.png', { type: 'image/png' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('avatar.png')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /enviar arquivo/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    const handleOpenChange = vi.fn();

    render(
      <TestWrapper>
        <UploadDialog open={true} onOpenChange={handleOpenChange} />
      </TestWrapper>
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
