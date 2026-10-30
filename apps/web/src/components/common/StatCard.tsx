import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;
  iconClassName?: string;
  description?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  descriptionClassName?: string;
}

/**
 * Componente unificado de Card de Estatística (Métrica)
 * Reutilizado no Overview, Webhooks e demais painéis analíticos.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconClassName,
  description,
  isLoading = false,
  className,
  valueClassName,
  descriptionClassName,
}) => {
  const renderIcon = () => {
    if (!icon) return null;

    // Se for um componente LucideIcon (função ou forwardRef)
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in (icon as Record<string, unknown>))) {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className={cn('size-4', iconClassName)} />;
    }

    // Se já for um elemento JSX ReactNode (ex: <HardDrive className="..." />)
    return <div className={cn('shrink-0', iconClassName)}>{icon as React.ReactNode}</div>;
  };

  return (
    <Card className={cn('shadow-xs', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {renderIcon()}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tracking-tight', valueClassName)}>
          {isLoading ? '...' : value}
        </div>
        {description && (
          <p className={cn('text-xs text-muted-foreground mt-1', descriptionClassName)}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
