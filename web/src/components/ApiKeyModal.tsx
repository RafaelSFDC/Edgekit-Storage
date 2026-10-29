import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  isAuthenticated: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isAuthenticated,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setErrorMsg('Por favor, informe a chave de API.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ apiKey: inputVal.trim() }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setInputVal('');
        onLoginSuccess();
        onClose();
      } else {
        setErrorMsg(json.error?.message || 'Chave de API inválida (401).');
      }
    } catch {
      setErrorMsg('Falha ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isAuthenticated && onClose()}>
      <DialogContent hideClose={!isAuthenticated}>
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>
                {isAuthenticated ? 'Sessão Ativa' : 'Acesso ao Dashboard'}
              </DialogTitle>
              <DialogDescription>
                Autenticação Segura via Cookie HttpOnly
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apiKeyInput">Secret API Key</Label>
            <Input
              id="apiKeyInput"
              type="password"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Digite sua API_KEY..."
              autoFocus
              className="font-mono text-xs"
            />
          </div>

          <Alert variant="default" className="bg-zinc-950/70 border-zinc-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <AlertDescription className="text-zinc-400 text-xs">
              Sua chave é validada no backend e salva em um{' '}
              <strong className="text-emerald-300">Cookie HttpOnly Seguro</strong>. O JavaScript não tem acesso a ela, prevenindo ataques XSS.
            </AlertDescription>
          </Alert>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {isAuthenticated && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Fechar
              </Button>
            )}
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading || !inputVal.trim()}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Entrar no Dashboard</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
