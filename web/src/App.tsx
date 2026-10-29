import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { UploadZone } from './components/UploadZone';
import { FileGrid } from './components/FileGrid';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PreviewModal } from './components/PreviewModal';
import { SnippetModal } from './components/SnippetModal';
import { TooltipProvider } from './components/ui/tooltip';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import type { StorageObject, ListResponse } from './types';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [previewObject, setPreviewObject] = useState<StorageObject | null>(null);

  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive unique folders from object keys
  const folders = React.useMemo(() => {
    const set = new Set<string>();
    objects.forEach((obj) => {
      const parts = obj.key.split('/');
      if (parts.length > 1) {
        set.add(parts[0]);
      }
    });
    return Array.from(set);
  }, [objects]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/files?limit=100', {
        credentials: 'include',
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setObjects([]);
        setIsKeyModalOpen(true);
        return;
      }

      const json: ListResponse = await res.json();

      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setObjects(json.data.objects || []);
      } else {
        setError(json.error?.message || 'Falha ao carregar arquivos do R2.');
      }
    } catch {
      setError('Erro de conexão ao carregar arquivos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth status on initial mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (res.ok) {
          setIsAuthenticated(true);
          fetchFiles();
        } else {
          setIsAuthenticated(false);
          setIsKeyModalOpen(true);
        }
      } catch {
        setIsAuthenticated(false);
        setIsKeyModalOpen(true);
      }
    };

    checkAuth();
  }, [fetchFiles]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    fetchFiles();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setObjects([]);
      setIsKeyModalOpen(true);
    }
  };

  const handleUploadSuccess = (newObject: StorageObject) => {
    setObjects((prev) => [newObject, ...prev]);
  };

  const handleDelete = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setObjects((prev) => prev.filter((o) => o.key !== key));
        if (previewObject?.key === key) {
          setPreviewObject(null);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-orange-500 selection:text-white">
        {/* Top Navbar */}
        <Navbar
          isAuthenticated={isAuthenticated}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
          onOpenSnippetModal={() => setIsSnippetModalOpen(true)}
          onLogout={handleLogout}
          onRefresh={fetchFiles}
          isLoading={isLoading}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error notification banner */}
          {error && (
            <Alert variant="destructive" className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <AlertDescription>{error}</AlertDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsKeyModalOpen(true)}
                className="h-7 text-xs border-red-800 text-red-200 hover:bg-red-900"
              >
                Configurar Chave
              </Button>
            </Alert>
          )}

          {/* Stats Bar */}
          <StatsBar
            objects={objects}
            folders={folders}
            isLoading={isLoading}
          />

          {/* Upload Drop Zone */}
          <UploadZone
            isAuthenticated={isAuthenticated}
            onUploadSuccess={handleUploadSuccess}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
          />

          {/* File Grid / Explorer */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Seus Arquivos</span>
                <span className="text-xs text-zinc-500 font-normal">
                  ({objects.length} itens)
                </span>
              </h2>
            </div>

            <FileGrid
              objects={objects}
              folders={folders}
              isLoading={isLoading}
              onDelete={handleDelete}
              onPreview={(obj) => setPreviewObject(obj)}
            />
          </div>
        </main>

        {/* Modals */}
        <ApiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          isAuthenticated={isAuthenticated}
        />

        <PreviewModal
          object={previewObject}
          onClose={() => setPreviewObject(null)}
        />

        <SnippetModal
          isOpen={isSnippetModalOpen}
          onClose={() => setIsSnippetModalOpen(false)}
        />

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
          <p>
            Cloudflare Storage • Powered by{' '}
            <span className="text-zinc-400 font-medium">Hono</span>,{' '}
            <span className="text-orange-400 font-medium">Cloudflare Workers</span> &{' '}
            <span className="text-amber-400 font-medium">R2</span> • Open-Source MIT
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
};
