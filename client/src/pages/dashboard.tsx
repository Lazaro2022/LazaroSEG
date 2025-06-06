import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsPanel } from "@/components/charts-panel";
import { DocumentsTable } from "@/components/documents-table";
import { TemporalAnalytics } from "@/components/temporal-analytics";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <KpiCards />
      <ChartsPanel />
      
      {/* Análise Temporal */}
      {dashboardStats?.monthlyData && dashboardStats?.yearlyComparison && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Análise Temporal</h2>
          <TemporalAnalytics 
            monthlyData={dashboardStats.monthlyData}
            yearlyComparison={dashboardStats.yearlyComparison}
          />
        </div>
      )}
    </div>
  );
}
