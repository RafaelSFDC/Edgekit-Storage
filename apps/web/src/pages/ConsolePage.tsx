import React, { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { FilesDataTable } from '../components/console/FilesDataTable';
import { UploadDialog } from '../components/console/UploadDialog';
import { FilePreviewDialog } from '../components/console/FilePreviewDialog';
import { SignedUrlDialog } from '../components/console/SignedUrlDialog';
import { useFilesQuery, useDeleteFileMutation, useBatchDeleteMutation } from '../hooks/api/use-files';
import { useI18n } from '../i18n/context';
import type { StorageObject } from '../types';

export const ConsolePage: React.FC = () => {
  const { t } = useI18n();
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);

  const currentCursor = cursorHistory[pageIndex] || null;

  const { data, isLoading, refetch } = useFilesQuery({
    limit: 50,
    cursor: currentCursor,
  });

  const deleteMutation = useDeleteFileMutation();
  const batchDeleteMutation = useBatchDeleteMutation();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageObject | null>(null);
  const [signedFile, setSignedFile] = useState<StorageObject | null>(null);

  const objects = data?.objects || [];
  const hasNextPage = Boolean(data?.truncated && data?.cursor);
  const hasPrevPage = pageIndex > 0;

  const handleNextPage = () => {
    if (data?.cursor) {
      setCursorHistory((prev) => {
        const next = [...prev];
        next[pageIndex + 1] = data.cursor!;
        return next;
      });
      setPageIndex((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    }
  };

  const handleDelete = (key: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir o arquivo "${key}"?`)) {
      deleteMutation.mutate(key);
    }
  };

  const handleBatchDelete = (keys: string[]) => {
    batchDeleteMutation.mutate(keys);
  };

  return (
    <PageLayout>
      <PageHeader
        title={t.console.title}
        description={t.console.subtitle}
      />

      <FilesDataTable
        data={objects}
        isLoading={isLoading || deleteMutation.isPending || batchDeleteMutation.isPending}
        onRefresh={() => refetch()}
        onOpenUpload={() => setIsUploadOpen(true)}
        onPreview={(file) => setPreviewFile(file)}
        onGenerateSignedUrl={(file) => setSignedFile(file)}
        onDelete={handleDelete}
        onBatchDelete={handleBatchDelete}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        pageIndex={pageIndex}
      />

      {/* Modais do Console */}
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
      />

      <FilePreviewDialog
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        onGenerateSignedUrl={(file) => setSignedFile(file)}
      />

      <SignedUrlDialog
        file={signedFile}
        open={Boolean(signedFile)}
        onOpenChange={(open) => !open && setSignedFile(null)}
      />
    </PageLayout>
  );
};
