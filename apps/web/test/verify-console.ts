import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../src/components/ui/select';
import { FilesDataTable } from '../src/components/console/FilesDataTable';
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
  assert(tableHtml.includes('Todos os tipos'), 'Select de tipos deve exibir o label "Todos os tipos" no valor selecionado');
  assert(tableHtml.includes('Todas as pastas'), 'Select de pastas deve exibir o label "Todas as pastas" no valor selecionado');
  console.log('✅ Renderização da tabela de arquivos validada!');

  // 2. Renderizar SnippetGenerator
  console.log('2. Validando renderização do SnippetGenerator...');
  const snippetsHtml = renderToStaticMarkup(
    React.createElement(SnippetGenerator)
  );
  assert(snippetsHtml.includes('cURL (CLI)'), 'Deve conter aba cURL');
  assert(snippetsHtml.includes('curl -X POST'), 'Deve conter comando curl');
  console.log('✅ Componente SnippetGenerator validado!');

  // 3. Validar Select com items e fallback dinâmico
  console.log('3. Validando resolução de labels nos componentes Select...');
  const durationOptions = [
    { value: '900', label: '15 minutos' },
    { value: '3600', label: '1 hora (recomendado)' },
  ];
  const selectHtmlWithItems = renderToStaticMarkup(
    React.createElement(
      Select,
      { value: '3600', items: durationOptions },
      React.createElement(SelectTrigger, null, React.createElement(SelectValue, null))
    )
  );
  assert(
    selectHtmlWithItems.includes('1 hora (recomendado)'),
    'Select com items deve exibir o label correspondente ("1 hora (recomendado)") em vez do raw value'
  );

  const selectHtmlWithChildrenFallback = renderToStaticMarkup(
    React.createElement(
      Select,
      { value: 'all' },
      React.createElement(SelectTrigger, null, React.createElement(SelectValue, null)),
      React.createElement(
        SelectContent,
        null,
        React.createElement(SelectItem, { value: 'all' }, 'Todos os tipos'),
        React.createElement(SelectItem, { value: 'images' }, 'Imagens')
      )
    )
  );
  assert(
    selectHtmlWithChildrenFallback.includes('Todos os tipos'),
    'Select com fallback dinâmico deve inferir e exibir "Todos os tipos" em vez de "all"'
  );
  console.log('✅ Resolução de labels do Select validada com sucesso (tanto via items prop quanto fallback)!');

  console.log('\n🎉 TODOS OS TESTES DOS COMPONENTES DO CONSOLE PASSARAM COM SUCESSO!\n');
}

testConsoleComponents().catch((err) => {
  console.error('❌ Falha nos testes do console:', err);
  process.exit(1);
});
