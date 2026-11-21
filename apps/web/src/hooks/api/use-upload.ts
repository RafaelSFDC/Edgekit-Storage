import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFilePresigned, uploadFile } from '../../services/api';
import { queryKeys } from './query-keys';
import { toast } from 'sonner';

export function useUploadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: {
      file: File;
      folder?: string;
      customName?: string;
      preserveName?: boolean;
      isPrivate?: boolean;
      signal?: AbortSignal;
    } | FormData) => {
      if (options instanceof FormData) {
        return uploadFile(options);
      }
      return uploadFilePresigned(options);
    },
    onSuccess: (data) => {
      toast.success(`Upload de "${data.key}" realizado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao enviar o arquivo.');
    },
  });
}
