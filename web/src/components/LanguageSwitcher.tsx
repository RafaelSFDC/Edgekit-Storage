import React from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { useI18n, type Locale } from '../i18n';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, t } = useI18n();

  const languages: { id: Locale; label: string; flag: string; short: string }[] = [
    { id: 'en', label: 'English', flag: '🇺🇸', short: 'EN' },
    { id: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷', short: 'PT' },
  ];

  const current = languages.find((l) => l.id === locale) || languages[0];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={
          <DropdownMenuTrigger render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 font-medium border-border hover:bg-muted/50"
            />
          }>
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{current.short}</span>
          </DropdownMenuTrigger>
        }>
        </TooltipTrigger>
        <TooltipContent>{t.navbar.languageTooltip}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.id}
            onClick={() => setLocale(lang.id)}
            className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{lang.flag}</span>
              <span>{lang.label}</span>
            </div>
            {locale === lang.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
