import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFiles, deleteFile, batchDeleteFiles, generateSignedUrl } from '../../services/api';
import { queryKeys } from './query-keys';
import { toast } from 'sonner';

export function useFilesQuery(params?: { limit?: number; cursor?: string | null; prefix?: string }) {
  return useQuery({
    queryKey: queryKeys.files.list(params),
    queryFn: () => fetchFiles(params),
    staleTime: 10_000,
  });
}

export function useDeleteFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => deleteFile(key),
    onSuccess: (data) => {
      toast.success(`Arquivo "${data.key}" excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao excluir o arquivo.');
    },
  });
}

export function useBatchDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keys: string[]) => batchDeleteFiles(keys),
    onSuccess: (data) => {
      toast.success(`${data.count} arquivo(s) excluído(s) com sucesso.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao excluir arquivos em lote.');
    },
  });
}

export function useSignedUrlMutation() {
  return useMutation({
    mutationFn: ({ key, expiresInSeconds }: { key: string; expiresInSeconds?: number }) =>
      generateSignedUrl(key, expiresInSeconds),
  });
}
