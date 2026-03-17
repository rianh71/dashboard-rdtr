import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useRefreshAll, useMainData } from "@/hooks/useRDTRData";

import Index from "./pages/Index";
import DataRDTR from "./pages/DataRDTR";
import SebaranRDTR from "./pages/SebaranRDTR";
import MonitoringRDTR from "./pages/MonitoringRDTR";
import PerubahanRDTR from "./pages/PerubahanRDTR";
import ReportPage from "./pages/ReportPage";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

function DashboardLayout() {
  const refreshAll = useRefreshAll();
  const { data, isFetching, dataUpdatedAt } = useMainData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            lastUpdated={lastUpdated}
            onRefresh={refreshAll}
            isRefreshing={isFetching}
          />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/data-rdtr" element={<DataRDTR />} />
              <Route path="/sebaran" element={<SebaranRDTR />} />
              <Route path="/monitoring" element={<MonitoringRDTR />} />
              <Route path="/perubahan" element={<PerubahanRDTR />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
            © 2026 RDTR Monitoring Dashboard
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
