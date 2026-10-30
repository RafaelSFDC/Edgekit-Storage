import React, { useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import {
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { EdgekitLogo } from '../components/common/EdgekitLogo';
import { useAuth } from '../context/auth-context';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login, isLoggingIn, error: authError } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Se já estiver autenticado, redireciona imediatamente para a dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Estado de carregamento da verificação inicial da sessão via cookie
  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary animate-pulse">
          <EdgekitLogo size={28} module="storage" />
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">{t.common.loading}</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmed = apiKey.trim();
    if (!trimmed) {
      setLocalError(t.login.invalidPasskey);
      return;
    }

    const success = await login(trimmed);
    if (!success) {
      setLocalError(authError || t.login.invalidPasskey);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-8 select-none">
      {/* Botões Utilitários de Idioma e Tema no Canto Superior Direito */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Globe className="size-3.5" />
          <span className="font-semibold text-[10px] uppercase bg-muted px-1 py-0.5 rounded border border-border/70">
            {locale === 'pt-BR' ? 'PT-BR' : 'EN'}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={t.navbar.themeTooltip}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="size-4 text-primary" />
          ) : (
            <Sun className="size-4 text-amber-500" />
          )}
        </Button>
      </div>

      {/* Container Centralizado Estilo Shadcn Login */}
      <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-6">
        {/* Header da Marca */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
            <EdgekitLogo size={28} module="storage" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">Edgekit</span>
            <span className="text-xl font-semibold text-primary">Storage</span>
          </div>
        </div>

        {/* Card de Autenticação */}
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {t.login.title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t.login.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field data-invalid={Boolean(displayError)}>
                <FieldLabel htmlFor="apiKey" className="text-xs font-medium text-foreground">
                  {t.login.passkeyLabel}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showPassword ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (displayError) setLocalError(null);
                    }}
                    placeholder={t.login.passkeyPlaceholder}
                    className="pr-10 font-mono text-sm"
                    autoFocus
                    required
                    disabled={isLoggingIn}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoggingIn}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
                {displayError && (
                  <FieldError className="mt-1">
                    {displayError}
                  </FieldError>
                )}
              </Field>

              {/* Botão de Envio */}
              <Button
                type="submit"
                className="w-full gap-2 mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoggingIn || !apiKey.trim()}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t.login.submitting}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    <span>{t.login.submitButton}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Nota de Segurança */}
        <p className="text-center text-[11px] text-muted-foreground/75 px-4">
          {t.login.secureNote}
        </p>
      </div>
    </div>
  );
};
