import React, { useState } from 'react';
import {
  HardDrive,
  Upload,
  Code2,
  ArrowRight,
  Database,
  Lock,
  Globe,
  FolderTree,
  Zap,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useI18n } from '../i18n/context';
import { useStatsQuery, useHealthQuery } from '../hooks/api/use-stats';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '../components/common/StatCard';
import { UploadDialog } from '../components/console/UploadDialog';
import { formatBytes } from '../lib/utils';

export const OverviewPage: React.FC = () => {
  const { t } = useI18n();
  const { data: stats, isLoading } = useStatsQuery();
  const { data: health } = useHealthQuery();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <PageLayout>
      {/* Cabeçalho padrão da Dashboard */}
      <PageHeader
        title={t.overview.title}
        description={t.overview.subtitle}
      />

      {/* 1. Métricas principais do Cluster Storage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Arquivos */}
        <StatCard
          title={t.stats.totalFiles}
          value={stats?.totalFiles ?? 0}
          icon={HardDrive}
          iconClassName="text-primary"
          description={stats?.privateFiles ? t.stats.privateFilesCount(stats.privateFiles) : t.stats.allItemsR2}
          isLoading={isLoading}
        />

        {/* Armazenamento Usado */}
        <StatCard
          title={t.stats.storageUsed}
          value={formatBytes(stats?.totalBytes ?? 0)}
          icon={Database}
          iconClassName="text-emerald-500"
          description="Cloudflare R2 sem taxa de egress"
          isLoading={isLoading}
        />

        {/* Arquivos Privados */}
        <StatCard
          title={t.stats.privateFiles}
          value={stats?.privateFiles ?? 0}
          icon={Lock}
          iconClassName="text-amber-500"
          description="Acesso restrito via URL assinada"
          isLoading={isLoading}
        />

        {/* Pastas Criadas */}
        <StatCard
          title={t.stats.foldersCount}
          value={stats?.foldersCount ?? 0}
          icon={FolderTree}
          iconClassName="text-purple-500"
          description="Estrutura hierárquica por chave"
          isLoading={isLoading}
        />
      </div>

      {/* 2. Atalhos para as demais áreas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Console de Arquivos */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <HardDrive className="size-4.5" />
              </div>
              {stats && stats.totalFiles > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.totalFiles} itens
                </Badge>
              )}
            </div>
            <CardTitle className="text-base mt-3">{t.overview.openConsole}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              Explore arquivos, visualize imagens e PDFs, e gere links assinados temporários.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/console" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Acessar</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 2: Enviar Novo Arquivo */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Upload className="size-4.5" />
            </div>
            <CardTitle className="text-base mt-3">{t.overview.uploadFile}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              Faça upload arrastando arquivos com suporte a pastas e proteção privada.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="w-full justify-between text-xs cursor-pointer"
            >
              <span>Enviar Arquivo</span>
              <ArrowRight className="size-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Exemplos de Integração */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Code2 className="size-4.5" />
            </div>
            <CardTitle className="text-base mt-3">{t.overview.viewSnippets}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              Trechos de código em cURL, TypeScript, Python, PHP, Go e Rust prontos para uso.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/snippets" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Ver Snippets</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </PageLayout>
  );
};
