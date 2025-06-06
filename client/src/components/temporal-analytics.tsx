import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { MonthlyStats, YearlyComparison } from "@shared/schema";

interface TemporalAnalyticsProps {
  monthlyData: MonthlyStats[];
  yearlyComparison: YearlyComparison;
}

export function TemporalAnalytics({ monthlyData, yearlyComparison }: TemporalAnalyticsProps) {
  const { currentYear, previousYear, growthRate } = yearlyComparison;

  const formatGrowthRate = (rate: number) => {
    const isPositive = rate >= 0;
    const icon = isPositive ? ArrowUp : ArrowDown;
    const color = isPositive ? "text-green-400" : "text-red-400";
    const IconComponent = icon;
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <IconComponent className="w-4 h-4" />
        <span>{Math.abs(rate)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Comparação Anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Ano Atual ({currentYear.year})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-white">
              {currentYear.totalDocuments}
            </div>
            <div className="text-sm text-gray-400">
              {currentYear.completedDocuments} concluídos
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {currentYear.completionRate}% eficiência
            </Badge>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Ano Anterior ({previousYear.year})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-white">
              {previousYear.totalDocuments}
            </div>
            <div className="text-sm text-gray-400">
              {previousYear.completedDocuments} concluídos
            </div>
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
              {previousYear.completionRate}% eficiência
            </Badge>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-white">
              {formatGrowthRate(growthRate)}
            </div>
            <div className="text-sm text-gray-400">
              Em relação ao ano anterior
            </div>
            <Badge className={growthRate >= 0 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
              {growthRate >= 0 ? "Em crescimento" : "Em declínio"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência Mensal */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendência Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.95)",
                      border: "1px solid rgba(55, 65, 81, 0.5)",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Criados"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Concluídos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conclusão Mensal */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.95)",
                      border: "1px solid rgba(55, 65, 81, 0.5)",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    formatter={(value) => [`${value}%`, "Taxa de Conclusão"]}
                  />
                  <Bar 
                    dataKey="completionRate" 
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Mensal Detalhado */}
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Histórico Mensal (Últimos 12 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {monthlyData.slice(-6).map((month, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-sm font-medium text-gray-300 mb-2">
                  {month.month}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Criados:</span>
                    <span className="text-blue-400">{month.created}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Concluídos:</span>
                    <span className="text-green-400">{month.completed}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Taxa:</span>
                    <Badge 
                      className={
                        month.completionRate >= 80 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : month.completionRate >= 60
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {month.completionRate}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}