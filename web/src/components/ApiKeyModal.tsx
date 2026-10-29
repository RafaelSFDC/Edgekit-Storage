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
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setErrorMsg(t.apiKeyModal.emptyError);
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
        setErrorMsg(json.error?.message || t.apiKeyModal.invalidError);
      }
    } catch {
      setErrorMsg(t.apiKeyModal.connectionError);
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
                {isAuthenticated ? t.apiKeyModal.titleActive : t.apiKeyModal.titleInactive}
              </DialogTitle>
              <DialogDescription>
                {t.apiKeyModal.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="apiKeyInput">{t.apiKeyModal.inputLabel}</Label>
            <Input
              id="apiKeyInput"
              type="password"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={t.apiKeyModal.inputPlaceholder}
              autoFocus
              className="font-mono text-sm"
            />
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-xs">
              {t.apiKeyModal.securityNotice}{' '}
              <span className="text-foreground font-medium">
                {t.apiKeyModal.securityNoticeHighlight}
              </span>
              {t.apiKeyModal.securityNoticeEnd}
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
                {t.apiKeyModal.cancel}
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
              <span>{t.apiKeyModal.authenticate}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
