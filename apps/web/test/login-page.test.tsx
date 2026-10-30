import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../src/pages/LoginPage';
import { TestWrapper } from './helpers/test-wrapper';

describe('Frontend LoginPage Component Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, data: { authenticated: false } }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  it('renders branding, title, password field and submit button', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Wait for initial auth check loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Edgekit')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/ek_/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');

    const submitBtn = screen.getByRole('button', { name: /entrar no console|sign in to console/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it('toggles password visibility when Eye icon button is clicked', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/ek_/i);
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = input.parentElement?.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn!);
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn!);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles language between PT-BR and EN and updates UI labels', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    const langBtn = screen.getByText(/PT-BR|EN/);
    expect(langBtn).toBeInTheDocument();

    const initialLang = langBtn.textContent;
    fireEvent.click(langBtn);

    const updatedLang = screen.getByText(/PT-BR|EN/);
    expect(updatedLang.textContent).not.toBe(initialLang);
  });

  it('enables submit button when passkey is typed and displays error on invalid key', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false }),
        });
      }
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () =>
            Promise.resolve({
              success: false,
              error: { message: 'API Key inválida' },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const input = await screen.findByPlaceholderText(/ek_/i, {}, { timeout: 3000 });
    fireEvent.change(input, { target: { value: 'wrong-key-123' } });

    const submitBtn = screen.getByRole('button', { name: /entrar no console|sign in to console/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsg = screen.getByText(/API Key inválida|Invalid API Key/i);
      expect(errorMsg).toBeInTheDocument();
    });
  });
});
