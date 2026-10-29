#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('\n⚡ ====================================================');
console.log('   EdgeKit Storage — Assistente de Configuração Rápida');
console.log('====================================================\n');

const envPath = path.resolve(process.cwd(), '.dev.vars');

if (!fs.existsSync(envPath)) {
  const generatedKey = 'ek_' + crypto.randomBytes(24).toString('base64url');
  
  const defaultEnv = `# EdgeKit Storage - Configurações Locais
# Gerado automaticamente pelo setup

API_KEY=${generatedKey}
PUBLIC_URL=http://localhost:8787/f
ALLOWED_MIME_TYPES=image/*,application/pdf
MAX_FILE_SIZE_MB=25
ENABLE_WORKER_FALLBACK_STREAM=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
`;

  fs.writeFileSync(envPath, defaultEnv, 'utf-8');
  console.log('✅ Arquivo .dev.vars criado com sucesso!');
  console.log(`🔑 Sua API Key local gerada: ${generatedKey}\n`);
} else {
  console.log('ℹ️  Arquivo .dev.vars já existe. Mantendo configurações existentes.\n');
}

console.log('--- Próximos Passos Recomendados ---');
console.log('1. Para testar localmente:');
console.log('   pnpm dev\n');
console.log('2. Para publicar na Cloudflare:');
console.log('   a) Criar o bucket R2:');
console.log('      pnpm wrangler r2 bucket create cloudflare-storage-bucket');
console.log('   b) Definir sua API Key de produção:');
console.log('      pnpm wrangler secret put API_KEY');
console.log('   c) Fazer deploy com 1 comando:');
console.log('      pnpm deploy\n');
console.log('🚀 Pronto! Seu storage serverless estará no ar com custo $0 de tráfego de saída.\n');
