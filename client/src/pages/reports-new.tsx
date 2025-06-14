import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, Users, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ProductivityCharts } from "@/components/reports/productivity-charts";
import type { DocumentWithUser } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    extincoes: number;
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
      extincoes: number;
    };
    monthlyProduction: Array<{
      month: string;
      completed: number;
      total: number;
    }>;
  }>;
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch productivity data
  const { 
    data: productivityData, 
    isLoading, 
    error 
  } = useQuery<ProductivityData>({
    queryKey: ['/api/reports/productivity'],
    refetchInterval: 2000
  });

  // PDF export mutation
  const pdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reports/pdf', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }
      
      const blob = await response.blob();
      return blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `relatorio-produtividade-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Exportado",
        description: "Relatório baixado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro na Exportação",
        description: "Falha ao gerar o relatório PDF. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="text-white mt-4">Carregando relatórios...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <p className="text-red-400">Erro ao carregar relatórios</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Sidebar />
      <div className="flex-1 md:ml-64 ml-0 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white">Relatórios de Produtividade</h1>
                <p className="text-gray-300 mt-1 text-sm md:text-base">Análise detalhada do desempenho do sistema</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full sm:w-40 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={() => pdfMutation.mutate()}
                  disabled={pdfMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {pdfMutation.isPending ? 'Gerando...' : 'Exportar PDF'}
                </Button>
              </div>
            </div>

            {/* KPI Summary */}
            {productivityData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <Card className="card-glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Total de Documentos</p>
                        <p className="text-3xl font-bold text-white">{productivityData.totalDocuments}</p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Taxa de Conclusão</p>
                        <p className="text-3xl font-bold text-white">{productivityData.completionRate.toFixed(1)}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Tempo Médio</p>
                        <p className="text-3xl font-bold text-white">{productivityData.averageCompletionTime.toFixed(1)}</p>
                        <p className="text-gray-400 text-xs">dias</p>
                      </div>
                      <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Documentos Vencidos</p>
                        <p className="text-3xl font-bold text-white">{productivityData.overdueDocuments}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            {productivityData && (
              <ProductivityCharts data={productivityData} />
            )}


          </div>
        </main>
      </div>
    </div>
  );
}