import { jsPDF } from 'jspdf';
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

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

function drawEnhancedPieChart(doc: jsPDF, centerX: number, centerY: number, radius: number, data: number[], labels: string[], colors: string[]) {
  const total = data.reduce((sum, value) => sum + value, 0);
  if (total === 0) return;

  let currentAngle = -Math.PI / 2; // Start from top

  data.forEach((value, index) => {
    if (value === 0) return;
    
    const sliceAngle = (value / total) * 2 * Math.PI;
    const rgb = hexToRgb(colors[index]);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    
    // Draw simplified pie slice as colored circle segments
    const steps = Math.max(1, Math.floor(sliceAngle * 20));
    for (let i = 0; i < steps; i++) {
      const angle = currentAngle + (i * sliceAngle / steps);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      doc.circle(x, y, 3, 'F');
    }
    
    currentAngle += sliceAngle;
  });
  
  // Draw center circle
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, radius * 0.4, 'F');
}

function drawEnhancedLineChart(doc: jsPDF, x: number, y: number, width: number, height: number, 
                              data1: number[], data2: number[], labels: string[], title: string) {
  // Draw chart background
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, height, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(x, y, width, height);
  
  // Draw title
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + 5, y - 5);
  
  if (data1.length === 0) return;
  
  const maxValue = Math.max(...data1, ...data2, 1);
  const stepX = width / Math.max(data1.length - 1, 1);
  
  // Draw grid lines
  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i <= 4; i++) {
    const gridY = y + (height * i / 4);
    doc.line(x, gridY, x + width, gridY);
  }
  
  // Draw data lines
  for (let i = 0; i < data1.length - 1; i++) {
    const x1 = x + (i * stepX);
    const x2 = x + ((i + 1) * stepX);
    const y1 = y + height - (data1[i] / maxValue * height);
    const y2 = y + height - (data1[i + 1] / maxValue * height);
    
    // Line for created documents (blue)
    doc.setDrawColor(59, 130, 246);
    doc.line(x1, y1, x2, y2);
    
    // Line for completed documents (green)
    const y1c = y + height - (data2[i] / maxValue * height);
    const y2c = y + height - (data2[i + 1] / maxValue * height);
    doc.setDrawColor(16, 185, 129);
    doc.line(x1, y1c, x2, y2c);
  }
  
  // Draw labels
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  labels.forEach((label, index) => {
    if (index < data1.length) {
      const labelX = x + (index * stepX);
      doc.text(label, labelX - 5, y + height + 10);
    }
  });
}

function drawEnhancedBarChart(doc: jsPDF, x: number, y: number, width: number, height: number,
                             data1: number[], data2: number[], labels: string[]) {
  // Draw chart background
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, height, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(x, y, width, height);
  
  if (data1.length === 0) return;
  
  const maxValue = Math.max(...data1, ...data2, 1);
  const barWidth = width / (data1.length * 3); // Space for 2 bars + gap
  
  data1.forEach((value, index) => {
    const barX = x + (index * width / data1.length) + 10;
    const barHeight1 = (value / maxValue) * height;
    const barHeight2 = (data2[index] / maxValue) * height;
    
    // Draw created documents bar (blue)
    doc.setFillColor(59, 130, 246);
    doc.rect(barX, y + height - barHeight1, barWidth, barHeight1, 'F');
    
    // Draw completed documents bar (green)
    doc.setFillColor(16, 185, 129);
    doc.rect(barX + barWidth + 2, y + height - barHeight2, barWidth, barHeight2, 'F');
    
    // Draw label
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    if (labels[index]) {
      doc.text(labels[index], barX, y + height + 10);
    }
  });
}

export async function generatePDFReport(): Promise<Buffer> {
  const reportData = await generateProductivityReport();
  const doc = new jsPDF();
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  // === PÁGINA 1: CAPA E RESUMO EXECUTIVO ===
  
  // Header com logo e título
  doc.setFillColor(30, 58, 138); // bg-blue-800
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('RELATÓRIO DE PRODUTIVIDADE', 20, 20);
  doc.setFontSize(14);
  doc.text('Sistema de Controle de Prazos e Produtividade', 20, 30);
  doc.text(`Unidade Prisional - Manaus, Amazonas`, 20, 37);
  
  // Data do relatório
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${currentDate}`, 150, 50);
  doc.text(`Administrador: Lazarus`, 150, 55);
  
  // === RESUMO EXECUTIVO ===
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text('RESUMO EXECUTIVO', 20, 70);
  
  // KPIs principais em caixas
  const kpiY = 85;
  
  // Total de Documentos
  doc.setFillColor(59, 130, 246, 0.1);
  doc.rect(20, kpiY, 40, 25, 'F');
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text(reportData.totalDocuments.toString(), 25, kpiY + 10);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Total de', 25, kpiY + 16);
  doc.text('Documentos', 25, kpiY + 20);
  
  // Taxa de Conclusão
  doc.setFillColor(16, 185, 129, 0.1);
  doc.rect(70, kpiY, 40, 25, 'F');
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129);
  doc.text(`${reportData.completionRate.toFixed(1)}%`, 75, kpiY + 10);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Taxa de', 75, kpiY + 16);
  doc.text('Conclusão', 75, kpiY + 20);
  
  // Tempo Médio
  doc.setFillColor(245, 158, 11, 0.1);
  doc.rect(120, kpiY, 40, 25, 'F');
  doc.setFontSize(20);
  doc.setTextColor(245, 158, 11);
  doc.text(`${reportData.averageCompletionTime.toFixed(1)}`, 125, kpiY + 10);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Tempo Médio', 125, kpiY + 16);
  doc.text('(dias)', 125, kpiY + 20);
  
  // Vencidos
  doc.setFillColor(239, 68, 68, 0.1);
  doc.rect(170, kpiY, 30, 25, 'F');
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68);
  doc.text(reportData.overdueDocuments.toString(), 175, kpiY + 10);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Vencidos', 175, kpiY + 16);
  
  // === STATUS DETALHADO ===
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('STATUS DOS DOCUMENTOS', 20, 130);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`• Documentos Concluídos: ${reportData.completedDocuments} (${reportData.completionRate.toFixed(1)}%)`, 25, 145);
  doc.text(`• Documentos em Andamento: ${reportData.inProgressDocuments}`, 25, 155);
  doc.text(`• Documentos Vencidos: ${reportData.overdueDocuments}`, 25, 165);
  doc.text(`• Total de Documentos Processados: ${reportData.totalDocuments}`, 25, 175);
  
  // === DISTRIBUIÇÃO POR TIPO ===
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('DISTRIBUIÇÃO POR TIPO DE DOCUMENTO', 20, 195);
  
  const typeData = [
    reportData.documentsByType.certidoes,
    reportData.documentsByType.relatorios,
    reportData.documentsByType.oficios
  ];
  const typeLabels = ['Certidões', 'Relatórios', 'Ofícios'];
  const typeColors = ['#3B82F6', '#F59E0B', '#10B981'];
  
  // Gráfico de pizza simples
  drawSimplePieChart(doc, 105, 230, 35, typeData, typeLabels, 'Distribuição por Tipo');
  
  // Legenda do gráfico adicional
  doc.setFontSize(10);
  typeLabels.forEach((label, index) => {
    const legendY = 210 + (index * 12);
    const rgb = hexToRgb(typeColors[index]);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(25, legendY - 3, 8, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(`${label}: ${typeData[index]} documentos`, 38, legendY + 3);
  });
  
  // === PÁGINA 2: ANÁLISE TEMPORAL ===
  doc.addPage();
  
  // Header da segunda página
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('ANÁLISE TEMPORAL E TENDÊNCIAS', 20, 15);
  
  // === PRODUÇÃO DIÁRIA ===
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('PRODUÇÃO DOS ÚLTIMOS 7 DIAS', 20, 45);
  
  // Gráfico de linha para produção diária
  const dailyData = reportData.dailyProduction.slice(-7);
  const dailyCreated = dailyData.map(d => d.created);
  const dailyCompleted = dailyData.map(d => d.completed);
  const dailyLabels = dailyData.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  
  drawSimpleBarChart(doc, 20, 55, 170, 50, dailyCreated, dailyLabels, 'Produção Diária - Criados');
  
  // === TENDÊNCIAS MENSAIS ===
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('TENDÊNCIAS MENSAIS (6 MESES)', 20, 125);
  
  // Gráfico de barras para tendências mensais
  const monthlyData = reportData.monthlyTrends.slice(-6);
  const monthlyCreated = monthlyData.map(m => m.created);
  const monthlyCompleted = monthlyData.map(m => m.completed);
  const monthlyLabels = monthlyData.map(m => m.month);
  
  drawSimpleBarChart(doc, 20, 135, 170, 60, monthlyCreated, monthlyLabels, 'Tendências Mensais - Criados');
  
  // === ANÁLISE DE PERFORMANCE ===
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('ANÁLISE DE PERFORMANCE', 20, 215);
  
  // Métricas de performance
  const avgDaily = dailyData.reduce((sum, d) => sum + d.completed, 0) / dailyData.length;
  const avgMonthly = monthlyData.reduce((sum, m) => sum + m.completed, 0) / monthlyData.length;
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`• Média diária de conclusões: ${avgDaily.toFixed(1)} documentos`, 25, 230);
  doc.text(`• Média mensal de conclusões: ${avgMonthly.toFixed(1)} documentos`, 25, 240);
  doc.text(`• Eficiência geral do sistema: ${reportData.completionRate.toFixed(1)}%`, 25, 250);
  
  // === PÁGINA 3: PRODUTIVIDADE POR SERVIDOR ===
  if (reportData.userProductivity.length > 0) {
    doc.addPage();
    
    // Header da terceira página
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('PRODUTIVIDADE POR SERVIDOR', 20, 15);
    
    let currentY = 35;
    
    reportData.userProductivity.forEach((user, index) => {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      
      // Caixa para cada servidor
      doc.setFillColor(248, 250, 252);
      doc.rect(20, currentY, 170, 45, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, currentY, 170, 45);
      
      // Nome do servidor
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text(user.userName, 25, currentY + 12);
      
      // Métricas principais
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${user.totalDocuments}`, 25, currentY + 22);
      doc.text(`Concluídos: ${user.completedDocuments}`, 70, currentY + 22);
      doc.text(`Em Andamento: ${user.inProgressDocuments}`, 125, currentY + 22);
      
      // Taxa de conclusão e tempo médio
      const completionColor = user.completionRate >= 80 ? [16, 185, 129] : 
                             user.completionRate >= 60 ? [245, 158, 11] : [239, 68, 68];
      
      doc.setTextColor(completionColor[0], completionColor[1], completionColor[2]);
      doc.text(`Taxa de Conclusão: ${user.completionRate.toFixed(1)}%`, 25, currentY + 32);
      doc.setTextColor(0, 0, 0);
      doc.text(`Tempo Médio: ${user.averageCompletionTime.toFixed(1)} dias`, 25, currentY + 40);
      
      // Distribuição por tipo
      doc.text(`Certidões: ${user.documentsByType.certidoes}`, 125, currentY + 32);
      doc.text(`Relatórios: ${user.documentsByType.relatorios}`, 125, currentY + 40);
      doc.text(`Ofícios: ${user.documentsByType.oficios}`, 160, currentY + 36);
      
      currentY += 55;
    });
  }
  
  // === RODAPÉ EM TODAS AS PÁGINAS ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount}`, 180, 290);
    doc.text('Sistema de Controle de Prazos - Lazarus CG', 20, 290);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}