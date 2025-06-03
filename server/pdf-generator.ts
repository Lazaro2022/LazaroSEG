import { jsPDF } from 'jspdf';
import { storage } from './storage';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const allDocuments = await storage.getAllDocuments();
  const archivedDocuments = await storage.getArchivedDocuments();
  const documents = [...allDocuments, ...archivedDocuments];
  const users = await storage.getAllUsers();
  
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixMonthsAgo = subMonths(now, 6);
  
  // System-wide statistics
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'Concluído').length;
  const inProgressDocuments = documents.filter(doc => doc.status === 'Em Andamento').length;
  const overdueDocuments = documents.filter(doc => {
    const deadline = new Date(doc.deadline);
    return deadline < now && doc.status !== 'Concluído';
  }).length;
  
  const completionRate = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;
  
  // Average completion time
  const completedDocsWithTime = documents.filter(doc => 
    doc.status === 'Concluído' && doc.completedAt && doc.createdAt
  );
  const averageCompletionTime = completedDocsWithTime.length > 0 
    ? completedDocsWithTime.reduce((acc, doc) => {
        const created = new Date(doc.createdAt);
        const completed = new Date(doc.completedAt!);
        return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / completedDocsWithTime.length
    : 0;
  
  // Documents by type
  const documentsByType = {
    certidoes: documents.filter(doc => doc.type === 'Certidão').length,
    relatorios: documents.filter(doc => doc.type === 'Relatório').length,
    oficios: documents.filter(doc => doc.type === 'Ofício').length,
  };
  
  // Daily production for last 30 days
  const dailyProduction = eachDayOfInterval({ start: thirtyDaysAgo, end: now }).map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const created = documents.filter(doc => 
      format(new Date(doc.createdAt), 'yyyy-MM-dd') === dateStr
    ).length;
    const completed = documents.filter(doc => 
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
    const monthDocs = documents.filter(doc => {
      const created = new Date(doc.createdAt);
      return created >= monthStart && created <= monthEnd;
    });
    const monthCompleted = documents.filter(doc => {
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
    const userDocs = documents.filter(doc => doc.assignedTo === user.id);
    const userCompleted = userDocs.filter(doc => doc.status === 'Concluído');
    const userInProgress = userDocs.filter(doc => doc.status === 'Em Andamento');
    const userOverdue = userDocs.filter(doc => {
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

function drawSimpleBarChart(doc: jsPDF, x: number, y: number, width: number, height: number, data: number[], labels: string[], title: string) {
  const maxValue = Math.max(...data);
  const barWidth = width / data.length * 0.8;
  const spacing = width / data.length * 0.2;
  
  // Title
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + width / 2, y - 5, { align: 'center' });
  
  // Draw bars
  data.forEach((value, index) => {
    const barHeight = maxValue > 0 ? (value / maxValue) * height : 0;
    const barX = x + (index * (barWidth + spacing));
    const barY = y + height - barHeight;
    
    // Bar
    doc.setFillColor(59, 130, 246);
    doc.rect(barX, barY, barWidth, barHeight, 'F');
    
    // Value label
    doc.setFontSize(8);
    doc.text(value.toString(), barX + barWidth / 2, barY - 2, { align: 'center' });
    
    // X-axis label
    doc.text(labels[index] || '', barX + barWidth / 2, y + height + 8, { align: 'center' });
  });
  
  // Y-axis
  doc.setDrawColor(0, 0, 0);
  doc.line(x, y, x, y + height);
  doc.line(x, y + height, x + width, y + height);
}

function drawSimplePieChart(doc: jsPDF, centerX: number, centerY: number, radius: number, data: number[], labels: string[], title: string) {
  const total = data.reduce((sum, value) => sum + value, 0);
  let currentAngle = 0;
  
  const colors = [
    [59, 130, 246],   // Blue
    [245, 158, 11],   // Orange
    [16, 185, 129],   // Green
    [239, 68, 68],    // Red
    [139, 92, 246]    // Purple
  ];
  
  // Title
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, centerX, centerY - radius - 10, { align: 'center' });
  
  // Draw pie slices
  data.forEach((value, index) => {
    if (value > 0) {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const color = colors[index % colors.length];
      
      doc.setFillColor(color[0], color[1], color[2]);
      
      // Simple rectangle representation instead of arc
      const rectSize = 15;
      const legendX = centerX + radius + 10;
      const legendY = centerY - radius + (index * 20);
      
      doc.rect(legendX, legendY, rectSize, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${labels[index]}: ${value} (${((value/total)*100).toFixed(1)}%)`, legendX + rectSize + 5, legendY + 7);
      
      currentAngle += sliceAngle;
    }
  });
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
  
  yPosition += 15;
  
  // Documents by Type Chart (Simple representation)
  drawSimplePieChart(
    doc, 
    pageWidth / 2, 
    yPosition + 30, 
    25, 
    [report.documentsByType.certidoes, report.documentsByType.relatorios, report.documentsByType.oficios],
    ['Certidões', 'Relatórios', 'Ofícios'],
    'Distribuição de Documentos por Tipo'
  );
  
  yPosition += 80;
  
  // Monthly Production Chart
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = margin;
  }
  
  drawSimpleBarChart(
    doc,
    margin,
    yPosition,
    pageWidth - 2 * margin,
    50,
    report.monthlyTrends.map(m => m.completed),
    report.monthlyTrends.map(m => m.month),
    'Documentos Concluídos por Mês (Últimos 6 meses)'
  );
  
  yPosition += 80;
  
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
  
  // Production Summary Table
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFontSize(14);
  doc.text('RESUMO DE PRODUÇÃO DIÁRIA (Últimos 10 dias)', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(9);
  const recentProduction = report.dailyProduction.slice(-10);
  
  // Table headers
  doc.text('Data', margin, yPosition);
  doc.text('Criados', margin + 40, yPosition);
  doc.text('Concluídos', margin + 80, yPosition);
  yPosition += 5;
  
  // Table rows
  recentProduction.forEach(day => {
    doc.text(day.date, margin, yPosition);
    doc.text(day.created.toString(), margin + 40, yPosition);
    doc.text(day.completed.toString(), margin + 80, yPosition);
    yPosition += 4;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('Sistema de Controle de Prazos e Produtividade', margin, pageHeight - 10);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}