import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { generatePDFReport, generateProductivityReport } from "./pdf-generator";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
      const report = await generateProductivityReport();
      res.json(report);
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
