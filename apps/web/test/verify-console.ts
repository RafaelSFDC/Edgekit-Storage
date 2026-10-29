import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilesDataTable } from '../src/components/console/FilesDataTable';
import { FilePreviewDialog } from '../src/components/console/FilePreviewDialog';
import { SignedUrlDialog } from '../src/components/console/SignedUrlDialog';
import { SnippetGenerator } from '../src/components/snippets/SnippetGenerator';
import { I18nProvider } from '../src/i18n/context';
import type { StorageObject } from '../src/types';

async function testConsoleComponents() {
  console.log('🧪 Iniciando testes de validação dos componentes do Storage Console...');

  const mockFiles: StorageObject[] = [
    {
      key: 'uploads/avatar.png',
      size: 1048576, // 1 MB
      uploadedAt: '2026-10-29T10:00:00.000Z',
      mimeType: 'image/png',
      url: 'http://localhost:8787/f/uploads/avatar.png',
      isPrivate: false,
    },
    {
      key: 'private/invoices/inv_2026_01.pdf',
      size: 2097152, // 2 MB
      uploadedAt: '2026-10-29T11:00:00.000Z',
      mimeType: 'application/pdf',
      url: 'http://localhost:8787/private/invoices/inv_2026_01.pdf',
      isPrivate: true,
    },
  ];

  // 1. Renderizar FilesDataTable com dados
  console.log('1. Validando renderização do FilesDataTable com arquivos...');
  const tableHtml = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(FilesDataTable, {
        data: mockFiles,
        isLoading: false,
        onRefresh: () => {},
        onOpenUpload: () => {},
        onPreview: () => {},
        onGenerateSignedUrl: () => {},
        onDelete: () => {},
        onBatchDelete: () => {},
      })
    )
  );

  assert(tableHtml.includes('avatar.png'), 'Tabela deve conter o arquivo avatar.png');
  assert(tableHtml.includes('inv_2026_01.pdf'), 'Tabela deve conter o arquivo inv_2026_01.pdf');
  assert(tableHtml.includes('1 MB'), 'Tabela deve formatar tamanho 1 MB');
  assert(tableHtml.includes('2 MB'), 'Tabela deve formatar tamanho 2 MB');
  assert(tableHtml.includes('Público'), 'Badge Público deve estar presente');
  assert(tableHtml.includes('Privado'), 'Badge Privado deve estar presente');
  console.log('✅ Renderização da tabela de arquivos validada!');

  // 2. Renderizar SnippetGenerator
  console.log('2. Validando renderização do SnippetGenerator...');
  const snippetsHtml = renderToStaticMarkup(
    React.createElement(SnippetGenerator)
  );
  assert(snippetsHtml.includes('cURL (CLI)'), 'Deve conter aba cURL');
  assert(snippetsHtml.includes('curl -X POST'), 'Deve conter comando curl');
  console.log('✅ Componente SnippetGenerator validado!');

  console.log('\n🎉 TODOS OS TESTES DOS COMPONENTES DO CONSOLE PASSARAM COM SUCESSO!\n');
}

testConsoleComponents().catch((err) => {
  console.error('❌ Falha nos testes do console:', err);
  process.exit(1);
});
