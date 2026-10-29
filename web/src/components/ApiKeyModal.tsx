import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, KeyRound } from 'lucide-react';
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
      setErrorMsg('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isAuthenticated && onClose()}>
      <DialogContent hideClose={!isAuthenticated}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>
                {isAuthenticated ? 'Sessão Ativa' : 'Acesso ao EdgeKit Storage'}
              </DialogTitle>
              <DialogDescription>
                Autenticação Segura via Cookie HttpOnly
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
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
              placeholder="Digite ou cole sua API_KEY..."
              autoFocus
              className="font-mono text-sm"
            />
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-xs">
              Sua chave é salva em um <span className="text-foreground font-medium">Cookie HttpOnly Seguro</span>. O código client-side não tem acesso à chave, garantindo proteção contra roubo via XSS.
            </AlertDescription>
          </Alert>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
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
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading || !inputVal.trim()}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Autenticar</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
