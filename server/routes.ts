import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { generatePDFReport, generateProductivityReport } from "./pdf-generator";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Helper functions for generating chart data
function generateDailyProduction(documents: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const created = documents.filter(doc => 
      doc.createdAt && doc.createdAt.toISOString().split('T')[0] === dateStr
    ).length;
    
    const completed = documents.filter(doc => 
      (doc.completedAt && doc.completedAt.toISOString().split('T')[0] === dateStr) ||
      (doc.archivedAt && doc.archivedAt.toISOString().split('T')[0] === dateStr)
    ).length;
    
    last30Days.push({
      date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
      created,
      completed
    });
  }
  
  return last30Days;
}

function generateMonthlyTrends(documents: any[]) {
  const last6Months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const created = documents.filter(doc => {
      if (!doc.createdAt) return false;
      const createdDate = new Date(doc.createdAt);
      return createdDate >= date && createdDate <= nextMonth;
    }).length;
    
    const completed = documents.filter(doc => {
      const completedDate = doc.completedAt ? new Date(doc.completedAt) : 
                           doc.archivedAt ? new Date(doc.archivedAt) : null;
      if (!completedDate) return false;
      return completedDate >= date && completedDate <= nextMonth;
    }).length;
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    last6Months.push({
      month: `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`,
      created,
      completed
    });
  }
  
  return last6Months;
}

function generateRealDailyProduction(documents: any[]) {
  const last7Days = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Conta documentos criados neste dia
    const created = documents.filter(doc => 
      doc.createdAt && doc.createdAt.toISOString().split('T')[0] === dateStr
    ).length;
    
    // Conta APENAS documentos que foram REALMENTE concluídos neste dia
    // Como todos estão "Em Andamento", completed será sempre 0
    const completed = documents.filter(doc => {
      // Só conta se foi arquivado E tem data de arquivamento neste dia
      if (doc.isArchived && doc.archivedAt) {
        return doc.archivedAt.toISOString().split('T')[0] === dateStr;
      }
      // Só conta se status é "Concluído" E foi atualizado neste dia
      if (doc.status === 'Concluído' && doc.updatedAt) {
        return doc.updatedAt.toISOString().split('T')[0] === dateStr;
      }
      // Caso contrário, não conta (todos estão "Em Andamento")
      return false;
    }).length;
    
    last7Days.push({
      date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
      created,
      completed // Será sempre 0 porque nenhum documento foi concluído
    });
  }
  
  return last7Days;
}

function generateRealMonthlyTrends(documents: any[]) {
  const last6Months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Conta documentos criados neste mês
    const created = documents.filter(doc => {
      if (!doc.createdAt) return false;
      const createdDate = new Date(doc.createdAt);
      return createdDate >= date && createdDate <= nextMonth;
    }).length;
    
    // Conta APENAS documentos que foram REALMENTE concluídos neste mês
    // Como nenhum documento foi concluído, completed será sempre 0
    const completed = documents.filter(doc => {
      let completionDate = null;
      
      // Só conta se foi arquivado E tem data de arquivamento válida
      if (doc.isArchived && doc.archivedAt) {
        completionDate = new Date(doc.archivedAt);
      }
      // Só conta se status é "Concluído" E tem data de atualização válida
      else if (doc.status === 'Concluído' && doc.updatedAt) {
        completionDate = new Date(doc.updatedAt);
      }
      
      // Se tem data de conclusão válida, verifica se foi neste mês
      if (completionDate) {
        return completionDate >= date && completionDate <= nextMonth;
      }
      // Caso contrário, não conta (todos estão "Em Andamento")
      return false;
    }).length;
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    last6Months.push({
      month: `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`,
      created,
      completed // Será sempre 0 porque nenhum documento foi concluído
    });
  }
  
  return last6Months;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with sample data
  await storage.initializeData();
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Document type statistics
  app.get("/api/dashboard/document-types", async (req, res) => {
    try {
      const stats = await storage.getDocumentTypeStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document type stats" });
    }
  });

  // Next deadline
  app.get("/api/dashboard/next-deadline", async (req, res) => {
    try {
      const deadline = await storage.getNextDeadline();
      res.json({ deadline });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch next deadline" });
    }
  });

  // Documents
  app.get("/api/documents", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const documents = limit 
        ? await storage.getRecentDocuments(limit)
        : await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/archived", async (req, res) => {
    try {
      const archivedDocuments = await storage.getArchivedDocuments();
      res.json(archivedDocuments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validation = insertDocumentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid document data", errors: validation.error.errors });
      }

      const document = await storage.createDocument(validation.data);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert date strings to Date objects
      if (updates.deadline && typeof updates.deadline === 'string') {
        updates.deadline = new Date(updates.deadline);
      }
      if (updates.completedAt && typeof updates.completedAt === 'string') {
        updates.completedAt = new Date(updates.completedAt);
      }
      
      // If marking as completed, set completedAt timestamp
      if (updates.status === "Concluído" && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      const document = await storage.updateDocument(id, updates);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert date strings to Date objects
      if (updates.deadline && typeof updates.deadline === 'string') {
        updates.deadline = new Date(updates.deadline);
      }
      if (updates.completedAt && typeof updates.completedAt === 'string') {
        updates.completedAt = new Date(updates.completedAt);
      }
      
      // If marking as completed, set completedAt timestamp
      if (updates.status === "Concluído" && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      const document = await storage.updateDocument(id, updates);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.post("/api/documents/:id/archive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const archived = await storage.archiveDocument(id);
      if (!archived) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(archived);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive document" });
    }
  });

  app.patch("/api/documents/:id/restore", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.restoreDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore document" });
    }
  });

  app.post("/api/documents/:id/restore", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restored = await storage.restoreDocument(id);
      if (!restored) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(restored);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore document" });
    }
  });

  // Servers/Productivity
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getAllServers();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.get("/api/servers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const server = await storage.getServer(id);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }
      res.json(server);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      console.log('Creating user with data:', userData);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Failed to create user", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      console.log('Updating user:', id, 'with data:', updates);
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Deleting user:', id);
      
      // Check if user has assigned documents
      const documents = await storage.getAllDocuments();
      const userDocuments = documents.filter(doc => doc.assignedTo === id);
      
      if (userDocuments.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete user with assigned documents",
          assignedDocuments: userDocuments.length
        });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Reports
  app.get("/api/reports/productivity", async (req, res) => {
    try {
      // Force fresh data without cache
      const activeDocuments = await storage.getAllDocuments();
      const archivedDocuments = await storage.getArchivedDocuments();
      const users = await storage.getAllUsers();
      
      const totalDocuments = activeDocuments.length + archivedDocuments.length;
      // Documentos concluídos = status 'Concluído' + todos os arquivados
      const completedDocuments = activeDocuments.filter(doc => doc.status === 'Concluído').length + archivedDocuments.length;
      const inProgressDocuments = activeDocuments.filter(doc => doc.status === 'Em Andamento').length;
      
      const now = new Date();
      const overdueDocuments = activeDocuments.filter(doc => {
        const deadline = new Date(doc.deadline);
        return deadline < now && doc.status !== 'Concluído';
      }).length;
      
      const completionRate = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;
      
      // Quick report with real-time data
      const quickReport = {
        totalDocuments,
        completedDocuments,
        inProgressDocuments,
        overdueDocuments,
        averageCompletionTime: 0,
        completionRate,
        documentsByType: {
          certidoes: [...activeDocuments, ...archivedDocuments].filter(doc => doc.type === 'Certidão').length,
          relatorios: [...activeDocuments, ...archivedDocuments].filter(doc => doc.type === 'Relatório').length,
          oficios: [...activeDocuments, ...archivedDocuments].filter(doc => doc.type === 'Ofício').length,
        },
        dailyProduction: generateRealDailyProduction([...activeDocuments, ...archivedDocuments]),
        monthlyTrends: generateRealMonthlyTrends([...activeDocuments, ...archivedDocuments]),
        userProductivity: users.map(user => {
          const userActiveDocuments = activeDocuments.filter(doc => doc.assignedTo === user.id);
          const userArchivedDocuments = archivedDocuments.filter(doc => doc.assignedTo === user.id);
          const userAllDocuments = [...userActiveDocuments, ...userArchivedDocuments];
          
          const userCompletedDocuments = userActiveDocuments.filter(doc => doc.status === 'Concluído').length + userArchivedDocuments.length;
          const userInProgressDocuments = userActiveDocuments.filter(doc => doc.status === 'Em Andamento').length;
          const userOverdueDocuments = userActiveDocuments.filter(doc => {
            const deadline = new Date(doc.deadline);
            return deadline < now && doc.status !== 'Concluído';
          }).length;
          
          const userCompletionRate = userAllDocuments.length > 0 ? (userCompletedDocuments / userAllDocuments.length) * 100 : 0;
          
          return {
            userId: user.id,
            userName: user.name,
            totalDocuments: userAllDocuments.length,
            completedDocuments: userCompletedDocuments,
            inProgressDocuments: userInProgressDocuments,
            overdueDocuments: userOverdueDocuments,
            completionRate: userCompletionRate,
            averageCompletionTime: 0,
            documentsByType: {
              certidoes: userAllDocuments.filter(doc => doc.type === 'Certidão').length,
              relatorios: userAllDocuments.filter(doc => doc.type === 'Relatório').length,
              oficios: userAllDocuments.filter(doc => doc.type === 'Ofício').length,
            },
            monthlyProduction: [],
          };
        })
      };
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(quickReport);
    } catch (error) {
      console.error('Error generating productivity report:', error);
      res.status(500).json({ message: "Failed to generate productivity report" });
    }
  });

  app.get("/api/reports/pdf", async (req, res) => {
    try {
      const pdfBuffer = await generatePDFReport();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-produtividade-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // System Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM system_settings ORDER BY id DESC LIMIT 1`);
      const settings = result.rows[0] || {
        system_name: 'Lazarus CG - Sistema de Controle',
        institution: 'Unidade Prisional - Manaus/AM',
        timezone: 'america/manaus',
        language: 'pt-br',
        urgent_days: 2,
        warning_days: 7,
        auto_archive: true
      };
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settings = req.body;
      
      // First try to update existing settings
      const updateResult = await db.execute(sql`
        UPDATE system_settings SET
          system_name = ${settings.systemName},
          institution = ${settings.institution},
          timezone = ${settings.timezone},
          language = ${settings.language},
          urgent_days = ${settings.urgentDays},
          warning_days = ${settings.warningDays},
          auto_archive = ${settings.autoArchive},
          updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `);
      
      if (updateResult.rows.length === 0) {
        // If no existing settings, insert new ones
        const insertResult = await db.execute(sql`
          INSERT INTO system_settings (system_name, institution, timezone, language, urgent_days, warning_days, auto_archive, updated_at)
          VALUES (${settings.systemName}, ${settings.institution}, ${settings.timezone}, ${settings.language}, ${settings.urgentDays}, ${settings.warningDays}, ${settings.autoArchive}, NOW())
          RETURNING *
        `);
        res.json(insertResult.rows[0]);
      } else {
        res.json(updateResult.rows[0]);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Export endpoints
  app.get("/api/reports/export", async (req, res) => {
    try {
      const { format = 'json', period = 'last6months' } = req.query;
      
      const documents = await storage.getAllDocuments();
      const servers = await storage.getAllServers();
      const stats = await storage.getDashboardStats();
      const typeStats = await storage.getDocumentTypeStats();
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        period,
        summary: stats,
        documentTypes: typeStats,
        documents: documents.map(doc => ({
          id: doc.id,
          processNumber: doc.processNumber,
          prisonerName: doc.prisonerName,
          type: doc.type,
          status: doc.status,
          deadline: doc.deadline,
          assignedUser: doc.assignedUser?.name || 'Não atribuído',
          createdAt: doc.createdAt,
          completedAt: doc.completedAt
        })),
        productivity: servers.map(server => ({
          name: server.user.name,
          role: server.user.role,
          totalDocuments: server.totalDocuments,
          completedDocuments: server.completedDocuments,
          completionPercentage: server.completionPercentage
        }))
      };

      if (format === 'csv') {
        // Convert to CSV format
        let csv = 'ID,Número do Processo,Nome do Interno,Tipo,Status,Prazo,Responsável,Criado em,Concluído em\n';
        documents.forEach(doc => {
          csv += `${doc.id},"${doc.processNumber}","${doc.prisonerName}","${doc.type}","${doc.status}","${doc.deadline}","${doc.assignedUser?.name || 'Não atribuído'}","${doc.createdAt}","${doc.completedAt || ''}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-documentos.csv"');
        res.send(csv);
      } else {
        res.json(reportData);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
