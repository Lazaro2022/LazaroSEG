import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductivityPanel } from "@/components/productivity-panel";
import { useQuery } from "@tanstack/react-query";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { Clock, AlertTriangle, CheckCircle, TrendingUp, Calendar, FileText } from "lucide-react";
import type { DocumentTypeStats, DocumentWithUser } from "@shared/schema";
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  certidoes: '#3b82f6', // blue
  relatorios: '#10b981', // green  
  oficios: '#f59e0b', // orange
  concluido: '#10b981', // green
  emAndamento: '#3b82f6', // blue
  urgente: '#ef4444', // red
  vencido: '#dc2626', // dark red
};

export function ChartsPanel() {
  const { data: typeStats, isLoading: typeLoading } = useQuery<DocumentTypeStats>({
    queryKey: ["/api/dashboard/document-types"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  // Processar dados para gráficos
  const chartData = typeStats ? [
    { name: 'Certidões', value: typeStats.certidoes, color: COLORS.certidoes },
    { name: 'Relatórios', value: typeStats.relatorios, color: COLORS.relatorios },
    { name: 'Ofícios', value: typeStats.oficios, color: COLORS.oficios },
  ] : [];

  // Dados de status dos documentos
  const statusData = documents ? (() => {
    const now = new Date();
    const urgentThreshold = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));

    let concluido = 0;
    let emAndamento = 0;
    let urgente = 0;
    let vencido = 0;

    documents.forEach(doc => {
      const deadline = new Date(doc.deadline);

      if (doc.status === "Concluído") {
        concluido++;
      } else if (deadline < now) {
        vencido++;
      } else if (deadline <= urgentThreshold) {
        urgente++;
      } else {
        emAndamento++;
      }
    });

    return [
      { name: 'Concluído', value: concluido, color: COLORS.concluido },
      { name: 'Em Andamento', value: emAndamento, color: COLORS.emAndamento },
      { name: 'Urgente', value: urgente, color: COLORS.urgente },
      { name: 'Vencido', value: vencido, color: COLORS.vencido },
    ];
  })() : [];

  // Dados de criação de documentos por dia da semana
  const weeklyData = documents ? (() => {
    const startWeek = startOfWeek(new Date(), { locale: ptBR });
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startWeek, i);
      return {
        name: format(day, 'EEE', { locale: ptBR }),
        fullName: format(day, 'EEEE', { locale: ptBR }),
        date: day,
        created: 0,
        completed: 0,
      };
    });

    documents.forEach(doc => {
      const createdDate = new Date(doc.createdAt);
      const dayIndex = weekDays.findIndex(day => 
        format(day.date, 'yyyy-MM-dd') === format(createdDate, 'yyyy-MM-dd')
      );

      if (dayIndex !== -1) {
        weekDays[dayIndex].created++;
        if (doc.status === "Concluído") {
          weekDays[dayIndex].completed++;
        }
      }
    });

    return weekDays;
  })() : [];

  // Dados de prazos dos próximos 7 dias
  const deadlineData = documents ? (() => {
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(new Date(), i);
      return {
        name: format(day, 'dd/MM'),
        fullName: format(day, 'EEEE, dd/MM', { locale: ptBR }),
        date: day,
        deadlines: 0,
        urgent: 0,
      };
    });

    documents.forEach(doc => {
      if (doc.status !== "Concluído") {
        const deadline = new Date(doc.deadline);
        const dayIndex = next7Days.findIndex(day => 
          format(day.date, 'yyyy-MM-dd') === format(deadline, 'yyyy-MM-dd')
        );

        if (dayIndex !== -1) {
          next7Days[dayIndex].deadlines++;
          if (dayIndex <= 1) { // próximos 2 dias são urgentes
            next7Days[dayIndex].urgent++;
          }
        }
      }
    });

    return next7Days;
  })() : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);

  if (typeLoading || documentsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="glass-morphism">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-48 bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Documentos por Tipo - Donut Chart */}
      <Card className="glass-morphism">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <FileText className="w-5 h-5 text-blue-400 mr-2" />
          <CardTitle className="text-lg font-semibold">Documentos por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{total}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {chartData.map((item) => {
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {item.value} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status dos Documentos - Pie Chart */}
      <Card className="glass-morphism">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
          <CardTitle className="text-lg font-semibold">Status dos Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{totalStatus}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {statusData.map((item) => {
              const percentage = totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {item.value} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Atividade Semanal - Bar Chart */}
      <Card className="glass-morphism">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
          <CardTitle className="text-lg font-semibold">Atividade Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="created" fill="#3b82f6" name="Criados" radius={[2, 2, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" name="Concluídos" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Prazos Próximos - Area Chart */}
      <Card className="glass-morphism">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Calendar className="w-5 h-5 text-orange-400 mr-2" />
          <CardTitle className="text-lg font-semibold">Prazos - Próximos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deadlineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="deadlines" 
                  stroke="#3b82f6" 
                  fill="rgba(59, 130, 246, 0.3)"
                  name="Prazos"
                />
                <Area 
                  type="monotone" 
                  dataKey="urgent" 
                  stroke="#ef4444" 
                  fill="rgba(239, 68, 68, 0.3)"
                  name="Urgentes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}