import { RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface DashboardHeaderProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export function DashboardHeader({ lastUpdated, onRefresh, isRefreshing, onExportExcel, onExportPDF }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4">
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
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        {onExportExcel && (
          <Button variant="outline" size="sm" onClick={onExportExcel} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        )}
        {onExportPDF && (
          <Button variant="outline" size="sm" onClick={onExportPDF} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        )}
      </div>
    </header>
  );
}
