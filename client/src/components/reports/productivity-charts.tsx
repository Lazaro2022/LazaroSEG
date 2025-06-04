import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, FileText, Users } from "lucide-react";
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
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
  }>;
}

interface ProductivityChartsProps {
  data: ProductivityData;
}

export function ProductivityCharts({ data }: ProductivityChartsProps) {
  // Gráfico de distribuição por tipo (pizza) - dados reais do banco
  const typeDistributionData = {
    labels: ['Certidões', 'Relatórios', 'Ofícios'],
    datasets: [{
      data: [
        data.documentsByType.certidoes,
        data.documentsByType.relatorios,
        data.documentsByType.oficios
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',   // Azul - Certidões
        'rgba(245, 158, 11, 0.8)',   // Laranja - Relatórios
        'rgba(16, 185, 129, 0.8)'    // Verde - Ofícios
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(245, 158, 11)',
        'rgb(16, 185, 129)'
      ],
      borderWidth: 2
    }]
  };

  // Gráfico de status dos documentos (barras) - dados reais
  const statusData = {
    labels: ['Em Andamento', 'Concluídos', 'Vencidos'],
    datasets: [{
      label: 'Quantidade de Documentos',
      data: [
        data.inProgressDocuments,
        data.completedDocuments,
        data.overdueDocuments
      ],
      backgroundColor: [
        'rgba(245, 158, 11, 0.8)',   // Amarelo - Em Andamento
        'rgba(16, 185, 129, 0.8)',   // Verde - Concluídos
        'rgba(239, 68, 68, 0.8)'     // Vermelho - Vencidos
      ],
      borderColor: [
        'rgb(245, 158, 11)',
        'rgb(16, 185, 129)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  };







  const barChartOptions = {
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
          color: 'rgb(156, 163, 175)',
          stepSize: 1
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
    <div className="space-y-6">
      {/* Primeira linha - Distribuição por tipo */}
      <div className="flex justify-center">
        <Card className="card-glass w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Tipo de Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut 
                data={typeDistributionData} 
                options={doughnutOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha - Status dos documentos */}
      <div className="flex justify-center">
        <Card className="card-glass w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Status dos Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar 
                data={statusData} 
                options={barChartOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terceira linha - Produtividade por servidor */}
      {data.userProductivity && data.userProductivity.length > 0 && (
        <div className="flex justify-center">
          <Card className="card-glass w-full max-w-4xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Produtividade por Servidor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={{
                    labels: data.userProductivity.map(user => user.userName),
                    datasets: [{
                      label: 'Total de Documentos',
                      data: data.userProductivity.map(user => user.totalDocuments),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 2
                    }, {
                      label: 'Documentos Concluídos',
                      data: data.userProductivity.map(user => user.completedDocuments),
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 2
                    }]
                  }}
                  options={barChartOptions}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}