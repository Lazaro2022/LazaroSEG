import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";

const cardConfigs = [
  {
    title: "Todos os Documentos",
    key: "totalDocuments" as keyof DashboardStats,
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    borderColor: "border-l-blue-500",
    progressValue: 100,
  },
  {
    title: "Em Andamento", 
    key: "inProgress" as keyof DashboardStats,
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    borderColor: "border-l-orange-500",
    progressValue: 26,
  },
  {
    title: "Concluídos",
    key: "completed" as keyof DashboardStats,
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/20", 
    borderColor: "border-l-green-500",
    progressValue: 85,
  },
  {
    title: "Vencidos",
    key: "overdue" as keyof DashboardStats,
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-l-red-500",
    progressValue: 15,
  },
];

export function KpiCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 2000, // Atualiza a cada 2 segundos
    refetchOnWindowFocus: true, // Atualiza quando a janela recebe foco
    staleTime: 0, // Considera dados sempre desatualizados
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardConfigs.map((_, index) => (
          <Card key={index} className="glass-morphism border-l-4 border-l-gray-500">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                <div className="h-2 bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardConfigs.map((config) => {
        const Icon = config.icon;
        const value = stats?.[config.key] || 0;
        
        return (
          <Card key={config.key} className={`kpi-card glass-morphism border-l-4 ${config.borderColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-300">{config.title}</h3>
                  <div className={`text-3xl font-bold mt-2 ${config.color}`}>
                    {value.toLocaleString()}
                  </div>
                </div>
                <div className={`w-12 h-12 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${config.color} w-6 h-6`} />
                </div>
              </div>
              <Progress 
                value={config.progressValue} 
                className="h-2 bg-gray-700"
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
