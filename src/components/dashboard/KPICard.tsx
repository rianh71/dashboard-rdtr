import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  gradient: 'blue' | 'emerald' | 'orange' | 'purple';
  subtitle?: string;
  linkTo?: string;
}

const gradientClasses = {
  blue: 'kpi-gradient-blue',
  emerald: 'kpi-gradient-emerald',
  orange: 'kpi-gradient-orange',
  purple: 'kpi-gradient-purple',
};

export function KPICard({ title, value, icon: Icon, gradient, subtitle, linkTo }: KPICardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (linkTo) navigate(linkTo);
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-xl bg-card card-shadow p-5 animate-fade-in flex items-start gap-4 transition-colors ${
        linkTo ? 'cursor-pointer hover:bg-muted/50' : ''
      }`}
    >
      <div className={`${gradientClasses[gradient]} rounded-lg p-3 flex-shrink-0`}>
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
