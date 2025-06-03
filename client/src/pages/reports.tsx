import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, Users, Clock, BarChart3, PieChart, LineChart, FileBarChart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { DocumentWithUser } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

interface ProductivityData {
  totalDocuments: number;
  completedDocuments: number;
  inProgressDocuments: number;
  overdueDocuments: number;
  averageCompletionTime: number;
  completionRate: number;
  documentsByType: {
    certidoes: number;
    relatorios: number;
    oficios: number;
  };
  dailyProduction: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    created: number;
    completed: number;
  }>;
  userProductivity: Array<{
    userId: number;
    userName: string;
    totalDocuments: number;
    completedDocuments: number;
    inProgressDocuments: number;
    overdueDocuments: number;
    completionRate: number;
    averageCompletionTime: number;
    documentsByType: {
      certidoes: number;
      relatorios: number;
      oficios: number;
    };
    monthlyProduction: Array<{
      month: string;
      completed: number;
      total: number;
    }>;
  }>;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("json");
  const [reportPeriod, setReportPeriod] = useState("last6months");

  const { data: documents } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  const { data: productivityData, isLoading: isLoadingProductivity } = useQuery<ProductivityData>({
    queryKey: ["/api/reports/productivity"],
    refetchInterval: 2000, // Atualiza a cada 2 segundos
    refetchOnWindowFocus: true, // Atualiza quando a janela recebe foco
    staleTime: 0, // Considera dados sempre desatualizados
  });

  const exportPDFMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reports/pdf');
      if (!response.ok) throw new Error('Failed to generate PDF report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `relatorio-produtividade-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Relatório PDF exportado",
        description: "O relatório de produtividade foi gerado e baixado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório PDF.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/reports/export?format=${exportFormat}&period=${reportPeriod}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dados-sistema-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Dados exportados",
        description: "Os dados do sistema foram exportados com sucesso.",
      });
    },
  });

  const handleExportPDF = () => {
    exportPDFMutation.mutate();
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  if (isLoadingProductivity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dados de produtividade...</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart configurations
  const documentTypeData = productivityData ? {
    labels: ['Certidões', 'Relatórios', 'Ofícios'],
    datasets: [{
      data: [
        productivityData.documentsByType.certidoes,
        productivityData.documentsByType.relatorios,
        productivityData.documentsByType.oficios
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(245, 158, 11)',
        'rgb(16, 185, 129)'
      ],
      borderWidth: 2
    }]
  } : null;

  const dailyProductionData = productivityData ? {
    labels: productivityData.dailyProduction.map(d => d.date),
    datasets: [
      {
        label: 'Documentos Criados',
        data: productivityData.dailyProduction.map(d => d.created),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Documentos Concluídos',
        data: productivityData.dailyProduction.map(d => d.completed),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  } : null;

  const monthlyTrendsData = productivityData ? {
    labels: productivityData.monthlyTrends.map(m => m.month),
    datasets: [
      {
        label: 'Documentos Criados',
        data: productivityData.monthlyTrends.map(m => m.created),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: 'Documentos Concluídos',
        data: productivityData.monthlyTrends.map(m => m.completed),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgb(156, 163, 175)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgb(156, 163, 175)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios de Produtividade</h1>
          <p className="text-gray-400">Análise detalhada da movimentação e produtividade do sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleExportPDF}
            disabled={exportPDFMutation.isPending || !productivityData}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            {exportPDFMutation.isPending ? "Gerando PDF..." : "Exportar PDF Completo"}
          </Button>
          
          <div className="flex gap-2">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleExportData}
              disabled={exportDataMutation.isPending}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      {productivityData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Total de Documentos</CardTitle>
              <FileText className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{productivityData.totalDocuments}</div>
              <p className="text-xs text-gray-400">Documentos no sistema</p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{productivityData.completionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-400">Eficiência geral</p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{productivityData.averageCompletionTime.toFixed(1)}</div>
              <p className="text-xs text-gray-400">Dias para conclusão</p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Documentos Vencidos</CardTitle>
              <Calendar className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{productivityData.overdueDocuments}</div>
              <p className="text-xs text-gray-400">Precisam de atenção</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Types Distribution */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {documentTypeData && (
                <Doughnut data={documentTypeData} options={doughnutOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Production */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Produção Diária (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dailyProductionData && (
                <Line data={dailyProductionData} options={chartOptions} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tendências Mensais (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {monthlyTrendsData && (
              <Bar data={monthlyTrendsData} options={chartOptions} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Productivity */}
      {productivityData?.userProductivity && (
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Produtividade por Servidor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {productivityData.userProductivity.map((user) => (
              <div key={user.userId} className="border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user.userName}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-300">
                      <span>Total: {user.totalDocuments}</span>
                      <span>Concluídos: {user.completedDocuments}</span>
                      <span>Em Andamento: {user.inProgressDocuments}</span>
                      <span>Vencidos: {user.overdueDocuments}</span>
                    </div>
                  </div>
                  <div className="flex flex-col lg:items-end gap-2">
                    <Badge 
                      className={`${
                        user.completionRate >= 80 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : user.completionRate >= 60
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {user.completionRate.toFixed(1)}% de conclusão
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Tempo médio: {user.averageCompletionTime.toFixed(1)} dias
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">{user.documentsByType.certidoes}</div>
                    <div className="text-gray-400">Certidões</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-semibold">{user.documentsByType.relatorios}</div>
                    <div className="text-gray-400">Relatórios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">{user.documentsByType.oficios}</div>
                    <div className="text-gray-400">Ofícios</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
          </div>
        </main>
      </div>
    </div>
  );
}