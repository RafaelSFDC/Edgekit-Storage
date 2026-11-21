import assert from 'node:assert';
import { queryKeys } from '../src/hooks/api/query-keys';
import { getQueryClient } from '../src/lib/query-client';

async function testQueryArchitecture() {
  console.log('🧪 Iniciando testes de validação da infraestrutura TanStack Query...');

  // 1. Validar QueryKeys
  console.log('1. Testando fábrica de queryKeys...');
  assert.deepStrictEqual(queryKeys.auth.all, ['auth']);
  assert.deepStrictEqual(queryKeys.auth.me(), ['auth', 'me']);
  assert.deepStrictEqual(queryKeys.files.all, ['files']);
  assert.deepStrictEqual(queryKeys.files.list({ limit: 10 }), ['files', 'list', { limit: 10 }]);
  assert.deepStrictEqual(queryKeys.stats.all, ['stats']);
  assert.deepStrictEqual(queryKeys.stats.summary(), ['stats', 'summary']);
  console.log('✅ queryKeys estruturadas e validadas com sucesso!');

  // 2. Validar QueryClient Singleton
  console.log('2. Testando QueryClient singleton...');
  const client1 = getQueryClient();
  const client2 = getQueryClient();
  assert.strictEqual(client1, client2, 'QueryClient deve ser um singleton');

  // Testar manipulação de cache diretamente no QueryClient singleton
  const testKey = ['test-entity', 'detail', '1'] as const;
  const testData = { name: 'EdgeKit Storage', status: 'online' };
  client1.setQueryData(testKey, testData);

  const cachedData = client1.getQueryData<typeof testData>(testKey);
  assert.deepStrictEqual(cachedData, testData, 'Dados do cache devem coincidir');

  client1.removeQueries({ queryKey: testKey });
  const clearedData = client1.getQueryData(testKey);
  assert.strictEqual(clearedData, undefined, 'Query deve ter sido removida do cache');

  client1.clear();
  console.log('✅ QueryClient singleton e manipulação de cache validados com 100% de sucesso!');

  console.log('\n🎉 TODOS OS TESTES DO QUERY CLIENT PASSARAM COM SUCESSO!\n');
}

testQueryArchitecture().catch((err) => {
  console.error('❌ Falha nos testes de query:', err);
  process.exit(1);
});
