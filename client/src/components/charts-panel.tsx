import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductivityPanel } from "@/components/productivity-panel";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import type { DocumentTypeStats } from "@shared/schema";

const COLORS = {
  certidoes: '#3b82f6', // blue
  relatorios: '#10b981', // green  
  oficios: '#f59e0b', // orange
};

export function ChartsPanel() {
  const { data: typeStats, isLoading } = useQuery<DocumentTypeStats>({
    queryKey: ["/api/dashboard/document-types"],
  });

  const chartData = typeStats ? [
    { name: 'Certidões', value: typeStats.certidoes, color: COLORS.certidoes },
    { name: 'Relatórios', value: typeStats.relatorios, color: COLORS.relatorios },
    { name: 'Ofícios', value: typeStats.oficios, color: COLORS.oficios },
  ] : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-morphism">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <ProductivityPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pie Chart */}
      <Card className="glass-morphism">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Documentos por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{total}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 space-y-2">
            {chartData.map((item) => {
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {item.value} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
