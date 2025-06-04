import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, LineChart, BarChart3 } from "lucide-react";
import { Doughnut, Line, Bar } from 'react-chartjs-2';
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
}

interface ProductivityChartsProps {
  data: ProductivityData;
}

export function ProductivityCharts({ data }: ProductivityChartsProps) {
  // Gráfico de distribuição por tipo (pizza)
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

  // Gráfico de produção diária (linha)
  const dailyProductionData = {
    labels: data.dailyProduction.map(d => d.date),
    datasets: [
      {
        label: 'Documentos Criados',
        data: data.dailyProduction.map(d => d.created),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Documentos Concluídos',
        data: data.dailyProduction.map(d => d.completed),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };



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
    <div className="space-y-6">
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
              <Doughnut 
                data={typeDistributionData} 
                options={doughnutOptions}
              />
            </div>
          </CardContent>
        </Card>

        {/* Daily Production */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Produção Diária (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line 
                data={dailyProductionData} 
                options={chartOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}