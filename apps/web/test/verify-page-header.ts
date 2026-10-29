import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader } from '../src/components/ui/page-header';

async function testPageHeader() {
  console.log('🧪 Iniciando testes de validação do componente PageHeader...');

  // 1. Título e subtítulo simples
  const html1 = renderToStaticMarkup(
    React.createElement(PageHeader, {
      title: 'Console de Arquivos',
      subtitle: 'Gerenciador de arquivos Cloudflare R2',
    })
  );
  assert(html1.includes('Console de Arquivos'), 'Deve renderizar o título');
  assert(html1.includes('Gerenciador de arquivos Cloudflare R2'), 'Deve renderizar o subtítulo');
  console.log('✅ Renderização de título e subtítulo validada!');

  // 2. Suporte a description como alias de subtitle
  const html2 = renderToStaticMarkup(
    React.createElement(PageHeader, {
      title: 'Visão Geral',
      description: 'Painel de métricas do bucket',
    })
  );
  assert(html2.includes('Painel de métricas do bucket'), 'Deve suportar description');
  console.log('✅ Suporte a description como alias validado!');

  // 3. Ações via children
  const html3 = renderToStaticMarkup(
    React.createElement(
      PageHeader,
      {
        title: 'Arquivos',
        subtitle: 'Lista de arquivos',
      },
      React.createElement('button', { type: 'button' }, 'Novo Upload')
    )
  );
  assert(html3.includes('Novo Upload'), 'Deve renderizar botões passados via children');
  console.log('✅ Renderização de botões de ação via children validada!');

  console.log('\n🎉 TODOS OS TESTES DO PAGEHEADER PASSARAM COM SUCESSO!\n');
}

testPageHeader().catch((err) => {
  console.error('❌ Falha nos testes de PageHeader:', err);
  process.exit(1);
});
