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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
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
      const res = await fetch('/api/files?limit=50', {
        credentials: 'include',
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setObjects([]);
        setNextCursor(null);
        setHasMore(false);
        setIsKeyModalOpen(true);
        return;
      }

      const json: ListResponse = await res.json();

      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setObjects(json.data.objects || []);
        setNextCursor(json.data.cursor || null);
        setHasMore(Boolean(json.data.truncated && json.data.cursor));
      } else {
        setError(json.error?.message || 'Falha ao carregar arquivos do bucket R2.');
      }
    } catch {
      setError('Erro de conexão ao carregar arquivos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMoreFiles = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/files?limit=50&cursor=${encodeURIComponent(nextCursor)}`, {
        credentials: 'include',
      });

      const json: ListResponse = await res.json();
      if (res.ok && json.success) {
        const newObjects = json.data.objects || [];
        setObjects((prev) => [...prev, ...newObjects]);
        setNextCursor(json.data.cursor || null);
        setHasMore(Boolean(json.data.truncated && json.data.cursor));
      } else {
        setError(json.error?.message || 'Falha ao carregar mais arquivos.');
      }
    } catch {
      setError('Erro de conexão ao carregar mais arquivos.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

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

  const handleBatchDelete = async (keys: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/files/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ keys }),
      });

      if (res.ok) {
        const keySet = new Set(keys);
        setObjects((prev) => prev.filter((o) => !keySet.has(o.key)));
        if (previewObject && keySet.has(previewObject.key)) {
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
      <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        {/* Top Navbar */}
        <Navbar
          isAuthenticated={isAuthenticated}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
          onOpenSnippetModal={() => setIsSnippetModalOpen(true)}
          onLogout={handleLogout}
          onRefresh={fetchFiles}
          isLoading={isLoading}
        />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Error notification banner */}
          {error && (
            <Alert variant="destructive" className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsKeyModalOpen(true)}
                className="h-8 text-xs border-destructive text-destructive hover:bg-destructive/10"
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

          {/* Storage Explorer Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Arquivos no Bucket
                </h2>
                <span className="text-xs text-muted-foreground font-normal">
                  ({objects.length} {objects.length === 1 ? 'item' : 'itens'})
                </span>
              </div>
            </div>

            <FileGrid
              objects={objects}
              folders={folders}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={fetchMoreFiles}
              onDelete={handleDelete}
              onBatchDelete={handleBatchDelete}
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
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground bg-background">
          <p>
            EdgeKit Storage • Desenvolvido para{' '}
            <span className="text-foreground font-medium">Cloudflare Workers & R2</span> • Open-Source MIT
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
};
