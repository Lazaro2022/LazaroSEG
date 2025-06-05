import { storage } from "./storage";
import { format, subDays, subMonths, eachDayOfInterval, eachMonthOfInterval, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    extincoes: number;
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
    extincoes: number;
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

  // System-wide statistics
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
    extincoes: allDocuments.filter(doc => doc.type === 'Extinção').length,
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
    const userCompleted = userDocs.filter(doc => 
      doc.status === 'Concluído' || archivedDocuments.some(archived => archived.id === doc.id)
    );
    const userInProgress = activeDocuments.filter(doc => 
      doc.assignedTo === user.id && doc.status === 'Em Andamento'
    );
    const userOverdue = activeDocuments.filter(doc => {
      if (doc.assignedTo !== user.id) return false;
      const deadline = new Date(doc.deadline);
      return deadline < now && doc.status !== 'Concluído';
    });

    const userCompletionRate = userDocs.length > 0 ? (userCompleted.length / userDocs.length) * 100 : 0;

    const userCompletedWithTime = userCompleted.filter(doc => 
      doc.completedAt && doc.createdAt
    );
    const userAvgCompletionTime = userCompletedWithTime.length > 0 
      ? userCompletedWithTime.reduce((acc, doc) => {
          const created = new Date(doc.createdAt);
          const completed = new Date(doc.completedAt!);
          return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / userCompletedWithTime.length
      : 0;

    const userDocsByType = {
      certidoes: userDocs.filter(doc => doc.type === 'Certidão').length,
      relatorios: userDocs.filter(doc => doc.type === 'Relatório').length,
      oficios: userDocs.filter(doc => doc.type === 'Ofício').length,
      extincoes: userDocs.filter(doc => doc.type === 'Extinção').length,
    };

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
      averageCompletionTime: userAvgCompletionTime,
      documentsByType: userDocsByType,
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
  const reportData = await generateProductivityReport();

  // For now, return a simple buffer - PDF generation would be implemented here
  const jsonData = JSON.stringify(reportData, null, 2);
  return Buffer.from(jsonData, 'utf8');
}