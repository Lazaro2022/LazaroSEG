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
      {/* Chart Section */}
      <div className="flex justify-center">
        {/* Document Types Distribution */}
        <Card className="card-glass w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Tipo de Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Doughnut 
                data={typeDistributionData} 
                options={doughnutOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}