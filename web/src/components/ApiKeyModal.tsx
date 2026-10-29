import React, { useState } from 'react';
import { Key, ShieldCheck, Check, X, AlertCircle, Loader2, Lock } from 'lucide-react';

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

  if (!isOpen) return null;

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
        credentials: 'include', // essential for HttpOnly cookie
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isAuthenticated ? 'Sessão Ativa' : 'Acesso ao Dashboard'}
              </h2>
              <p className="text-xs text-zinc-400">Autenticação Segura via Cookie HttpOnly</p>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleLogin} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Secret API Key
            </label>
            <input
              type="password"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Digite sua API_KEY..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm font-mono text-white placeholder-zinc-500 outline-none transition-all"
            />
          </div>

          <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Sua chave é validada no backend e salva em um <strong className="text-emerald-300">Cookie HttpOnly Seguro</strong>. O JavaScript não tem acesso a ela, prevenindo ataques XSS.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Fechar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Entrar no Dashboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
