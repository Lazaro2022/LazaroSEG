import jsPDF from 'jspdf';
import { generateProductivityReport as getReportData } from './reports';

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
  return await getReportData();
}

function drawSimpleBarChart(doc: jsPDF, x: number, y: number, width: number, height: number, data: number[], labels: string[], title: string) {
  doc.setFontSize(12);
  doc.text(title, x, y - 5);
  
  const maxValue = Math.max(...data);
  const barWidth = width / data.length;
  
  data.forEach((value, index) => {
    const barHeight = (value / maxValue) * height;
    const barX = x + (index * barWidth);
    const barY = y + height - barHeight;
    
    doc.setFillColor(100, 150, 200);
    doc.rect(barX, barY, barWidth - 2, barHeight, 'F');
    
    doc.setFontSize(8);
    doc.text(labels[index] || `${index + 1}`, barX + 2, y + height + 10);
    doc.text(value.toString(), barX + 2, barY - 2);
  });
}

function drawSimplePieChart(doc: jsPDF, centerX: number, centerY: number, radius: number, data: number[], labels: string[], title: string) {
  doc.setFontSize(12);
  doc.text(title, centerX - 20, centerY - radius - 10);
  
  const total = data.reduce((sum, value) => sum + value, 0);
  let currentAngle = 0;
  
  const colors = [
    [255, 99, 132],
    [54, 162, 235],
    [255, 205, 86],
    [75, 192, 192]
  ];
  
  data.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const color = colors[index % colors.length];
    
    doc.setFillColor(color[0], color[1], color[2]);
    
    // Simple arc approximation using lines
    const steps = 20;
    const stepAngle = sliceAngle / steps;
    
    for (let i = 0; i <= steps; i++) {
      const angle = currentAngle + (i * stepAngle);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        doc.line(centerX, centerY, x, y);
      } else {
        const prevAngle = currentAngle + ((i - 1) * stepAngle);
        const prevX = centerX + Math.cos(prevAngle) * radius;
        const prevY = centerY + Math.sin(prevAngle) * radius;
        doc.line(prevX, prevY, x, y);
      }
    }
    
    currentAngle += sliceAngle;
  });
  
  // Legend
  let legendY = centerY + radius + 20;
  data.forEach((value, index) => {
    const color = colors[index % colors.length];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(centerX - 40, legendY, 5, 5, 'F');
    doc.setFontSize(10);
    doc.text(`${labels[index]}: ${value}`, centerX - 30, legendY + 4);
    legendY += 10;
  });
}

export async function generatePDFReport(): Promise<Buffer> {
  const reportData = await generateProductivityReport();
  
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Relatório de Produtividade', 20, 20);
  doc.text('Sistema de Controle de Prazos', 20, 30);
  
  // System statistics
  doc.setFontSize(14);
  doc.text('Estatísticas do Sistema', 20, 50);
  doc.setFontSize(10);
  doc.text(`Total de Documentos: ${reportData.totalDocuments}`, 20, 60);
  doc.text(`Documentos Concluídos: ${reportData.completedDocuments}`, 20, 70);
  doc.text(`Em Andamento: ${reportData.inProgressDocuments}`, 20, 80);
  doc.text(`Vencidos: ${reportData.overdueDocuments}`, 20, 90);
  doc.text(`Taxa de Conclusão: ${reportData.completionRate.toFixed(1)}%`, 20, 100);
  doc.text(`Tempo Médio de Conclusão: ${reportData.averageCompletionTime.toFixed(1)} dias`, 20, 110);
  
  // Documents by type chart
  const typeData = [
    reportData.documentsByType.certidoes,
    reportData.documentsByType.relatorios,
    reportData.documentsByType.oficios
  ];
  const typeLabels = ['Certidões', 'Relatórios', 'Ofícios'];
  
  drawSimplePieChart(doc, 60, 160, 30, typeData, typeLabels, 'Distribuição por Tipo');
  
  // Monthly trends chart
  const monthlyData = reportData.monthlyTrends.slice(-6).map(trend => trend.completed);
  const monthlyLabels = reportData.monthlyTrends.slice(-6).map(trend => trend.month);
  
  drawSimpleBarChart(doc, 20, 220, 160, 40, monthlyData, monthlyLabels, 'Tendências Mensais (Concluídos)');
  
  // User productivity section
  if (reportData.userProductivity.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Produtividade por Servidor', 20, 20);
    
    let currentY = 40;
    reportData.userProductivity.forEach((user, index) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.text(`${user.userName}`, 20, currentY);
      doc.setFontSize(10);
      doc.text(`Total: ${user.totalDocuments} | Concluídos: ${user.completedDocuments} | Em Andamento: ${user.inProgressDocuments}`, 20, currentY + 10);
      doc.text(`Taxa de Conclusão: ${user.completionRate.toFixed(1)}% | Tempo Médio: ${user.averageCompletionTime.toFixed(1)} dias`, 20, currentY + 20);
      
      currentY += 40;
    });
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}