import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { jsPDF } from 'jspdf';
import { storage } from './storage';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 400,
  backgroundColour: 'white',
  plugins: {
    modern: ['chartjs-adapter-date-fns']
  }
});

export interface ProductivityReport {
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
}

export interface SystemReport {
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
  userProductivity: ProductivityReport[];
}

export async function generateProductivityReport(): Promise<SystemReport> {
  const activeDocuments = await storage.getAllDocuments();
  const archivedDocuments = await storage.getArchivedDocuments();
  const users = await storage.getAllUsers();
  
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixMonthsAgo = subMonths(now, 6);
  
  // System-wide statistics - count all documents (active + archived)
  const totalDocuments = activeDocuments.length + archivedDocuments.length;
  const completedDocuments = activeDocuments.filter(doc => doc.status === 'Concluído').length + archivedDocuments.length;
  const inProgressDocuments = activeDocuments.filter(doc => doc.status === 'Em Andamento').length;
  const overdueDocuments = activeDocuments.filter(doc => {
    const deadline = new Date(doc.deadline);
    return deadline < now && doc.status !== 'Concluído';
  }).length;
  
  const completionRate = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;
  
  // Average completion time - use both active completed docs and archived docs
  const allCompletedDocs = [...activeDocuments.filter(doc => doc.status === 'Concluído'), ...archivedDocuments];
  const completedDocsWithTime = allCompletedDocs.filter(doc => 
    doc.completedAt && doc.createdAt
  );
  const averageCompletionTime = completedDocsWithTime.length > 0 
    ? completedDocsWithTime.reduce((acc, doc) => {
        const created = new Date(doc.createdAt);
        const completed = new Date(doc.completedAt!);
        return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / completedDocsWithTime.length
    : 0;
  
  // Documents by type - count all documents (active + archived)
  const allDocuments = [...activeDocuments, ...archivedDocuments];
  const documentsByType = {
    certidoes: allDocuments.filter(doc => doc.type === 'Certidão').length,
    relatorios: allDocuments.filter(doc => doc.type === 'Relatório').length,
    oficios: allDocuments.filter(doc => doc.type === 'Ofício').length,
  };
  
  // Daily production for last 30 days
  const dailyProduction = eachDayOfInterval({ start: thirtyDaysAgo, end: now }).map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const created = allDocuments.filter(doc => 
      format(new Date(doc.createdAt), 'yyyy-MM-dd') === dateStr
    ).length;
    const completed = allDocuments.filter(doc => 
      doc.completedAt && format(new Date(doc.completedAt), 'yyyy-MM-dd') === dateStr
    ).length;
    
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      created,
      completed
    };
  });
  
  // Monthly trends for last 6 months
  const monthlyTrends = eachMonthOfInterval({ start: sixMonthsAgo, end: now }).map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const monthDocs = allDocuments.filter(doc => {
      const created = new Date(doc.createdAt);
      return created >= monthStart && created <= monthEnd;
    });
    const monthCompleted = allDocuments.filter(doc => {
      if (!doc.completedAt) return false;
      const completed = new Date(doc.completedAt);
      return completed >= monthStart && completed <= monthEnd;
    });
    
    return {
      month: format(monthStart, 'MMM/yy', { locale: ptBR }),
      created: monthDocs.length,
      completed: monthCompleted.length
    };
  });
  
  // User productivity
  const userProductivity: ProductivityReport[] = users.map(user => {
    const userDocs = allDocuments.filter(doc => doc.assignedTo === user.id);
    const userCompleted = userDocs.filter(doc => doc.status === 'Concluído' || archivedDocuments.some(archived => archived.id === doc.id));
    const userInProgress = activeDocuments.filter(doc => doc.assignedTo === user.id && doc.status === 'Em Andamento');
    const userOverdue = activeDocuments.filter(doc => doc.assignedTo === user.id && {
      const deadline = new Date(doc.deadline);
      return deadline < now && doc.status !== 'Concluído';
    });
    
    const userCompletionRate = userDocs.length > 0 ? (userCompleted.length / userDocs.length) * 100 : 0;
    
    const userAvgTime = userCompleted.filter(doc => doc.completedAt).length > 0
      ? userCompleted.filter(doc => doc.completedAt).reduce((acc, doc) => {
          const created = new Date(doc.createdAt);
          const completed = new Date(doc.completedAt!);
          return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / userCompleted.filter(doc => doc.completedAt).length
      : 0;
    
    const monthlyProduction = eachMonthOfInterval({ start: sixMonthsAgo, end: now }).map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthUserDocs = userDocs.filter(doc => {
        const created = new Date(doc.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
      const monthUserCompleted = userCompleted.filter(doc => {
        if (!doc.completedAt) return false;
        const completed = new Date(doc.completedAt);
        return completed >= monthStart && completed <= monthEnd;
      });
      
      return {
        month: format(monthStart, 'MMM/yy', { locale: ptBR }),
        completed: monthUserCompleted.length,
        total: monthUserDocs.length
      };
    });
    
    return {
      userId: user.id,
      userName: user.name,
      totalDocuments: userDocs.length,
      completedDocuments: userCompleted.length,
      inProgressDocuments: userInProgress.length,
      overdueDocuments: userOverdue.length,
      completionRate: userCompletionRate,
      averageCompletionTime: userAvgTime,
      documentsByType: {
        certidoes: userDocs.filter(doc => doc.type === 'Certidão').length,
        relatorios: userDocs.filter(doc => doc.type === 'Relatório').length,
        oficios: userDocs.filter(doc => doc.type === 'Ofício').length,
      },
      monthlyProduction
    };
  });
  
  return {
    totalDocuments,
    completedDocuments,
    inProgressDocuments,
    overdueDocuments,
    averageCompletionTime,
    completionRate,
    documentsByType,
    dailyProduction,
    monthlyTrends,
    userProductivity
  };
}

export async function generatePDFReport(): Promise<Buffer> {
  const report = await generateProductivityReport();
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // PDF Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 100, 200);
  doc.text('RELATÓRIO DE PRODUTIVIDADE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Sistema de Controle de Prazos e Produtividade`, pageWidth / 2, yPosition, { align: 'center' });
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  yPosition += 20;
  
  // System Overview
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('RESUMO GERAL DO SISTEMA', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  const systemStats = [
    `Total de Documentos: ${report.totalDocuments}`,
    `Documentos Concluídos: ${report.completedDocuments}`,
    `Documentos em Andamento: ${report.inProgressDocuments}`,
    `Documentos Vencidos: ${report.overdueDocuments}`,
    `Taxa de Conclusão: ${report.completionRate.toFixed(1)}%`,
    `Tempo Médio de Conclusão: ${report.averageCompletionTime.toFixed(1)} dias`
  ];
  
  systemStats.forEach(stat => {
    doc.text(stat, margin, yPosition);
    yPosition += 6;
  });
  
  yPosition += 10;
  
  // Documents by Type Chart
  try {
    const typeChartConfig = {
      type: 'doughnut' as const,
      data: {
        labels: ['Certidões', 'Relatórios', 'Ofícios'],
        datasets: [{
          data: [
            report.documentsByType.certidoes,
            report.documentsByType.relatorios,
            report.documentsByType.oficios
          ],
          backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribuição de Documentos por Tipo',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom' as const
          }
        }
      }
    };
    
    const typeChartBuffer = await chartJSNodeCanvas.renderToBuffer(typeChartConfig);
    doc.addImage(typeChartBuffer, 'PNG', margin, yPosition, pageWidth - 2 * margin, 80);
    yPosition += 90;
  } catch (error) {
    console.error('Error generating type chart:', error);
  }
  
  // Daily Production Chart
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = margin;
  }
  
  try {
    const dailyChartConfig = {
      type: 'line' as const,
      data: {
        labels: report.dailyProduction.map(d => d.date),
        datasets: [
          {
            label: 'Documentos Criados',
            data: report.dailyProduction.map(d => d.created),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Documentos Concluídos',
            data: report.dailyProduction.map(d => d.completed),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Produção Diária (Últimos 30 dias)',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom' as const
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };
    
    const dailyChartBuffer = await chartJSNodeCanvas.renderToBuffer(dailyChartConfig);
    doc.addImage(dailyChartBuffer, 'PNG', margin, yPosition, pageWidth - 2 * margin, 80);
    yPosition += 90;
  } catch (error) {
    console.error('Error generating daily chart:', error);
  }
  
  // User Productivity Section
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFontSize(16);
  doc.text('PRODUTIVIDADE POR SERVIDOR', margin, yPosition);
  yPosition += 15;
  
  report.userProductivity.forEach((user, index) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 200);
    doc.text(user.userName, margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const userStats = [
      `Total: ${user.totalDocuments} | Concluídos: ${user.completedDocuments} | Em Andamento: ${user.inProgressDocuments}`,
      `Taxa de Conclusão: ${user.completionRate.toFixed(1)}% | Tempo Médio: ${user.averageCompletionTime.toFixed(1)} dias`,
      `Certidões: ${user.documentsByType.certidoes} | Relatórios: ${user.documentsByType.relatorios} | Ofícios: ${user.documentsByType.oficios}`
    ];
    
    userStats.forEach(stat => {
      doc.text(stat, margin, yPosition);
      yPosition += 5;
    });
    
    yPosition += 8;
  });
  
  // Monthly Trends Chart
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = margin;
  }
  
  try {
    const monthlyChartConfig = {
      type: 'bar' as const,
      data: {
        labels: report.monthlyTrends.map(m => m.month),
        datasets: [
          {
            label: 'Documentos Criados',
            data: report.monthlyTrends.map(m => m.created),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: '#3B82F6',
            borderWidth: 1
          },
          {
            label: 'Documentos Concluídos',
            data: report.monthlyTrends.map(m => m.completed),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: '#10B981',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Tendências Mensais (Últimos 6 meses)',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom' as const
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };
    
    const monthlyChartBuffer = await chartJSNodeCanvas.renderToBuffer(monthlyChartConfig);
    doc.addImage(monthlyChartBuffer, 'PNG', margin, yPosition, pageWidth - 2 * margin, 80);
  } catch (error) {
    console.error('Error generating monthly chart:', error);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}