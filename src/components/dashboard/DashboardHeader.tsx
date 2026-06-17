import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface DashboardHeaderProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({ lastUpdated, onRefresh, isRefreshing }: DashboardHeaderProps) {
  return (
    <header className="bg-card/80 backdrop-blur-md border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-primary/3 to-transparent pointer-events-none" />
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-foreground" />
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">DASHBOARD RDTR</h1>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last Updated: {lastUpdated.toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </header>
  );
}
