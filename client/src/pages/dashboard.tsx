import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsPanel } from "@/components/charts-panel";
import { TemporalAnalytics } from "@/components/temporal-analytics";
import { DocumentsTable } from "@/components/documents-table";
import { useQuery } from "@tanstack/react-query";
import type { MonthlyStats, YearlyComparison } from "@shared/schema";

export default function Dashboard() {
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyStats[]>({
    queryKey: ["/api/dashboard/monthly-data"],
  });

  const { data: yearlyComparison, isLoading: yearlyLoading } = useQuery<YearlyComparison>({
    queryKey: ["/api/dashboard/yearly-comparison"],
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 ml-0 flex flex-col">
        <Header />
        
        <div className="flex-1 p-3 md:p-6 overflow-y-auto">
          <div className="space-y-4 md:space-y-6">
            <KpiCards />
            <ChartsPanel />
            
            {/* Temporal Analytics - Monthly and Yearly Charts */}
            {!monthlyLoading && !yearlyLoading && monthlyData && yearlyComparison && (
              <div className="mt-6">
                <TemporalAnalytics 
                  monthlyData={monthlyData} 
                  yearlyComparison={yearlyComparison} 
                />
              </div>
            )}
            
            {(monthlyLoading || yearlyLoading) && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-glass animate-pulse">
                    <div className="h-6 bg-white/10 rounded w-1/2 mb-4"></div>
                    <div className="h-48 bg-white/5 rounded"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
