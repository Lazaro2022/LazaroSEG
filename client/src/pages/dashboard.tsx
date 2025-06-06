import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsPanel } from "@/components/charts-panel";
import { DocumentsTable } from "@/components/documents-table";
import { TemporalAnalytics } from "@/components/temporal-analytics";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 ml-0 flex flex-col">
        <Header />
        
        <div className="flex-1 p-3 md:p-6 overflow-y-auto">
          <div className="space-y-4 md:space-y-6">
            <KpiCards />
            <ChartsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
