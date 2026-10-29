import React from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { SnippetGenerator } from '../components/snippets/SnippetGenerator';
import { useI18n } from '../i18n/context';

export const SnippetsPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <PageLayout>
      <PageHeader
        title={t.snippets.title}
        description={t.snippets.subtitle}
      />

      <SnippetGenerator />
    </PageLayout>
  );
};
