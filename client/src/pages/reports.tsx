import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { FileText, Download, Calendar, TrendingUp, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DocumentWithUser, ServerWithUser, DashboardStats, DocumentTypeStats } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import React from "react";

export default function ReportsPage() {
  const { data: documents } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  const { data: servers } = useQuery<ServerWithUser[]>({
    queryKey: ["/api/servers"],
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: typeStats } = useQuery<DocumentTypeStats>({
    queryKey: ["/api/dashboard/document-types"],
  });

  // Generate monthly data for the last 6 months
  const monthlyData = React.useMemo(() => {
    if (!documents) return [];

    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthDocs = documents.filter(doc => {
        const docDate = new Date(doc.createdAt);
        return docDate >= monthStart && docDate <= monthEnd;
      });

      const completed = monthDocs.filter(doc => doc.status === "Concluído").length;
      const inProgress = monthDocs.filter(doc => doc.status === "Em Andamento").length;
      const overdue = monthDocs.filter(doc => doc.status === "Vencido").length;

      return {
        month: format(month, "MMM/yy", { locale: ptBR }),
        total: monthDocs.length,
        completed,
        inProgress,
        overdue,
        efficiency: monthDocs.length > 0 ? Math.round((completed / monthDocs.length) * 100) : 0
      };
    });
  }, [documents]);

  // Productivity by user data
  const productivityData = servers?.map(server => ({
    name: server.user.name,
    initials: server.user.initials,
    role: server.user.role,
    total: server.totalDocuments,
    completed: server.completedDocuments,
    efficiency: server.completionPercentage
  })) || [];

  // Document type distribution
  const typeData = typeStats ? [
    { name: 'Certidões', value: typeStats.certidoes, color: '#3b82f6' },
    { name: 'Relatórios', value: typeStats.relatorios, color: '#10b981' },
    { name: 'Ofícios', value: typeStats.oficios, color: '#f59e0b' },
  ] : [];

  const handleExportReport = () => {
    // In a real implementation, this would generate and download a PDF or Excel file
    alert("Funcionalidade de exportação será implementada em breve.");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 ml-64 flex flex-col">
        <Header />
        
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
            
            <div className="flex items-center space-x-4">
              <Select defaultValue="last6months">
                <SelectTrigger className="w-48 bg-gray-800/50 border-gray-600/30">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="glass-morphism-dark border-white/10">
                  <SelectItem value="last6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="thisyear">Este ano</SelectItem>
                  <SelectItem value="lastyear">Ano anterior</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleExportReport}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-morphism border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total de Documentos</p>
                    <p className="text-2xl font-bold text-blue-500">{stats?.totalDocuments || 0}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Taxa de Conclusão</p>
                    <p className="text-2xl font-bold text-green-500">
                      {stats?.totalDocuments ? Math.round((stats.completed / stats.totalDocuments) * 100) : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Em Andamento</p>
                    <p className="text-2xl font-bold text-orange-500">{stats?.inProgress || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Servidores Ativos</p>
                    <p className="text-2xl font-bold text-purple-500">{servers?.length || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Performance Chart */}
          <Card className="glass-morphism">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="w-5 h-5 mr-2" />
                Desempenho Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="completed" fill="#10b981" name="Concluídos" />
                    <Bar dataKey="inProgress" fill="#f59e0b" name="Em Andamento" />
                    <Bar dataKey="overdue" fill="#ef4444" name="Vencidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Types Distribution */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 space-y-2">
                  {typeData.map((item) => {
                    const total = typeData.reduce((sum, type) => sum + type.value, 0);
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

            {/* Efficiency Trend */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>Tendência de Eficiência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value}%`, 'Eficiência']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#14b8a6" 
                        strokeWidth={3}
                        dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Productivity by Server */}
          <Card className="glass-morphism">
            <CardHeader>
              <CardTitle>Produtividade por Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Servidor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Cargo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Concluídos</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Eficiência</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivityData
                      .sort((a, b) => b.efficiency - a.efficiency)
                      .map((server, index) => (
                        <tr 
                          key={server.name} 
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                                index === 0 ? 'from-blue-500 to-purple-600' :
                                index === 1 ? 'from-green-500 to-teal-600' :
                                index === 2 ? 'from-yellow-500 to-orange-600' :
                                'from-red-500 to-pink-600'
                              } flex items-center justify-center text-white text-xs font-semibold`}>
                                {server.initials}
                              </div>
                              <span className="text-white font-medium">{server.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-300">{server.role}</td>
                          <td className="py-4 px-4 text-white">{server.total}</td>
                          <td className="py-4 px-4 text-white">{server.completed}</td>
                          <td className="py-4 px-4">
                            <span className={`font-semibold ${
                              server.efficiency >= 90 ? 'text-green-500' :
                              server.efficiency >= 75 ? 'text-orange-500' :
                              'text-red-500'
                            }`}>
                              {server.efficiency}%
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={
                                server.efficiency >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                server.efficiency >= 75 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }
                            >
                              {server.efficiency >= 90 ? 'Excelente' :
                               server.efficiency >= 75 ? 'Bom' : 'Precisa Melhorar'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}