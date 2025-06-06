import { users, documents, servers, type User, type InsertUser, type Document, type InsertDocument, type Server, type InsertServer, type DocumentWithUser, type ServerWithUser, type DashboardStats, type DocumentTypeStats, type MonthlyStats, type YearlyComparison } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ne, gt, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Documents
  getDocument(id: number): Promise<DocumentWithUser | undefined>;
  getAllDocuments(): Promise<DocumentWithUser[]>;
  getArchivedDocuments(): Promise<DocumentWithUser[]>;
  getRecentDocuments(limit?: number): Promise<DocumentWithUser[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  archiveDocument(id: number): Promise<Document | undefined>;
  restoreDocument(id: number): Promise<Document | undefined>;
  
  // Servers/Productivity
  getServer(id: number): Promise<ServerWithUser | undefined>;
  getAllServers(): Promise<ServerWithUser[]>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined>;
  
  // Dashboard stats
  getDashboardStats(): Promise<DashboardStats>;
  getDocumentTypeStats(): Promise<DocumentTypeStats>;
  getNextDeadline(): Promise<Date | null>;
}

export class DatabaseStorage implements IStorage {
  async initializeData() {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return; // Data already initialized
    }

    // Create users
    const sampleUsers: InsertUser[] = [
      { username: "lazarus.admin", password: "admin123", name: "Lazarus", role: "Administrador do Sistema - Manaus/AM", initials: "LAZ" },
      { username: "ana.costa", password: "123456", name: "Ana Costa", role: "Coordenadora Jurídica", initials: "AC" },
      { username: "marco.silva", password: "123456", name: "Marco Silva", role: "Assistente Social", initials: "MS" },
      { username: "lucia.ferreira", password: "123456", name: "Lucia Ferreira", role: "Psicóloga", initials: "LF" },
      { username: "roberto.castro", password: "123456", name: "Roberto Castro", role: "Advogado", initials: "RC" },
    ];

    const insertedUsers = await db.insert(users).values(sampleUsers).returning();

    // Create documents
    const now = new Date();
    const sampleDocuments = [
      {
        processNumber: "2024.001.0156",
        prisonerName: "João Silva Santos",
        type: "Certidão",
        deadline: new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)),
        status: "Urgente",
        assignedTo: insertedUsers[0].id,
      },
      {
        processNumber: "2024.001.0157",
        prisonerName: "Maria Oliveira Costa",
        type: "Relatório",
        deadline: new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)),
        status: "Em Andamento",
        assignedTo: insertedUsers[1].id,
      },
      {
        processNumber: "2024.001.0158",
        prisonerName: "Carlos Eduardo Lima",
        type: "Ofício",
        deadline: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
        status: "Concluído",
        assignedTo: insertedUsers[2].id,
      },
      {
        processNumber: "2024.001.0159",
        prisonerName: "Ana Paula Rodrigues",
        type: "Certidão",
        deadline: new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)),
        status: "Em Andamento",
        assignedTo: insertedUsers[0].id,
      },
      {
        processNumber: "2024.001.0160",
        prisonerName: "Fernando Santos Pereira",
        type: "Relatório",
        deadline: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)),
        status: "Vencido",
        assignedTo: insertedUsers[3].id,
      },
    ];

    await db.insert(documents).values(sampleDocuments);

    // Create servers/productivity data
    const sampleServers = [
      { userId: insertedUsers[0].id, totalDocuments: 127, completedDocuments: 119, completionPercentage: 94 },
      { userId: insertedUsers[1].id, totalDocuments: 98, completedDocuments: 85, completionPercentage: 87 },
      { userId: insertedUsers[2].id, totalDocuments: 156, completedDocuments: 119, completionPercentage: 76 },
      { userId: insertedUsers[3].id, totalDocuments: 89, completedDocuments: 61, completionPercentage: 68 },
    ];

    await db.insert(servers).values(sampleServers);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First, unassign any documents assigned to this user
      await db.update(documents)
        .set({ assignedTo: null })
        .where(eq(documents.assignedTo, id));
      
      // Then, delete any related servers records
      await db.delete(servers).where(eq(servers.userId, id));
      
      // Finally, delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Document methods
  async getDocument(id: number): Promise<DocumentWithUser | undefined> {
    const [doc] = await db.select({
      id: documents.id,
      processNumber: documents.processNumber,
      prisonerName: documents.prisonerName,
      type: documents.type,
      deadline: documents.deadline,
      status: documents.status,
      assignedTo: documents.assignedTo,
      createdAt: documents.createdAt,
      completedAt: documents.completedAt,
      archivedAt: documents.archivedAt,
      isArchived: documents.isArchived,
      assignedUser: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(documents)
    .leftJoin(users, eq(documents.assignedTo, users.id))
    .where(eq(documents.id, id));

    if (!doc) return undefined;

    return {
      ...doc,
      assignedUser: doc.assignedUser?.id ? doc.assignedUser : undefined
    };
  }

  async getAllDocuments(): Promise<DocumentWithUser[]> {
    const docs = await db.select({
      id: documents.id,
      processNumber: documents.processNumber,
      prisonerName: documents.prisonerName,
      type: documents.type,
      deadline: documents.deadline,
      status: documents.status,
      assignedTo: documents.assignedTo,
      createdAt: documents.createdAt,
      completedAt: documents.completedAt,
      archivedAt: documents.archivedAt,
      isArchived: documents.isArchived,
      assignedUser: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(documents)
    .leftJoin(users, eq(documents.assignedTo, users.id))
    .where(eq(documents.isArchived, false))
    .orderBy(desc(documents.createdAt));

    return docs.map(doc => ({
      ...doc,
      assignedUser: doc.assignedUser?.id ? doc.assignedUser : undefined
    }));
  }

  async getArchivedDocuments(): Promise<DocumentWithUser[]> {
    const docs = await db.select({
      id: documents.id,
      processNumber: documents.processNumber,
      prisonerName: documents.prisonerName,
      type: documents.type,
      deadline: documents.deadline,
      status: documents.status,
      assignedTo: documents.assignedTo,
      createdAt: documents.createdAt,
      completedAt: documents.completedAt,
      archivedAt: documents.archivedAt,
      isArchived: documents.isArchived,
      assignedUser: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(documents)
    .leftJoin(users, eq(documents.assignedTo, users.id))
    .where(eq(documents.isArchived, true))
    .orderBy(desc(documents.archivedAt));

    return docs.map(doc => ({
      ...doc,
      assignedUser: doc.assignedUser?.id ? doc.assignedUser : undefined
    }));
  }

  async getRecentDocuments(limit: number = 10): Promise<DocumentWithUser[]> {
    const docs = await db.select({
      id: documents.id,
      processNumber: documents.processNumber,
      prisonerName: documents.prisonerName,
      type: documents.type,
      deadline: documents.deadline,
      status: documents.status,
      assignedTo: documents.assignedTo,
      createdAt: documents.createdAt,
      completedAt: documents.completedAt,
      archivedAt: documents.archivedAt,
      isArchived: documents.isArchived,
      assignedUser: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(documents)
    .leftJoin(users, eq(documents.assignedTo, users.id))
    .orderBy(desc(documents.createdAt))
    .limit(limit);

    return docs.map(doc => ({
      ...doc,
      assignedUser: doc.assignedUser?.id ? doc.assignedUser : undefined
    }));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values({
      ...insertDocument,
      assignedTo: insertDocument.assignedTo || null
    }).returning();
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const [updatedDoc] = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updatedDoc || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount || 0) > 0;
  }

  async archiveDocument(id: number): Promise<Document | undefined> {
    const [archivedDoc] = await db.update(documents)
      .set({ 
        isArchived: true, 
        archivedAt: new Date(),
        status: "Arquivado"
      })
      .where(eq(documents.id, id))
      .returning();
    return archivedDoc || undefined;
  }

  async restoreDocument(id: number): Promise<Document | undefined> {
    const [restoredDoc] = await db.update(documents)
      .set({ 
        isArchived: false, 
        archivedAt: null,
        status: "Em Andamento"
      })
      .where(eq(documents.id, id))
      .returning();
    return restoredDoc || undefined;
  }

  // Server methods
  async getServer(id: number): Promise<ServerWithUser | undefined> {
    const [result] = await db.select({
      id: servers.id,
      userId: servers.userId,
      totalDocuments: servers.totalDocuments,
      completedDocuments: servers.completedDocuments,
      completionPercentage: servers.completionPercentage,
      user: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(servers)
    .innerJoin(users, eq(servers.userId, users.id))
    .where(eq(servers.id, id));

    return result || undefined;
  }

  async getAllServers(): Promise<ServerWithUser[]> {
    return await db.select({
      id: servers.id,
      userId: servers.userId,
      totalDocuments: servers.totalDocuments,
      completedDocuments: servers.completedDocuments,
      completionPercentage: servers.completionPercentage,
      user: {
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        initials: users.initials,
      }
    })
    .from(servers)
    .innerJoin(users, eq(servers.userId, users.id));
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const [server] = await db.insert(servers).values({
      ...insertServer,
      totalDocuments: insertServer.totalDocuments || 0,
      completedDocuments: insertServer.completedDocuments || 0,
      completionPercentage: insertServer.completionPercentage || 0
    }).returning();
    return server;
  }

  async updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined> {
    const [updatedServer] = await db.update(servers)
      .set(updates)
      .where(eq(servers.id, id))
      .returning();
    return updatedServer || undefined;
  }

  // Dashboard stats methods
  async getDashboardStats(): Promise<DashboardStats> {
    // Busca documentos ativos e arquivados separadamente
    const activeDocuments = await this.getAllDocuments();
    const archivedDocuments = await this.getArchivedDocuments();
    
    const totalDocuments = activeDocuments.length + archivedDocuments.length;
    const inProgress = activeDocuments.filter(doc => doc.status === "Em Andamento").length;
    
    // Documentos concluídos = status 'Concluído' + todos os arquivados
    const completedActive = activeDocuments.filter(doc => doc.status === "Concluído").length;
    const completed = completedActive + archivedDocuments.length;
    
    // Documentos vencidos (apenas entre os ativos)
    const now = new Date();
    const overdue = activeDocuments.filter(doc => {
      const deadline = new Date(doc.deadline);
      return deadline < now && doc.status !== 'Concluído';
    }).length;

    // Gerar dados mensais dos últimos 12 meses
    const monthlyData = await this.getMonthlyData();
    
    // Gerar comparação anual
    const yearlyComparison = await this.getYearlyComparison();

    return {
      totalDocuments,
      inProgress,
      completed,
      overdue,
      monthlyData,
      yearlyComparison,
    };
  }

  private async getMonthlyData(): Promise<MonthlyStats[]> {
    const allDocuments = await db.select().from(documents);
    const now = new Date();
    const monthlyStats: MonthlyStats[] = [];

    // Últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      
      const monthDocuments = allDocuments.filter(doc => {
        const createdAt = new Date(doc.createdAt);
        return createdAt >= date && createdAt < nextMonth;
      });

      const completedInMonth = allDocuments.filter(doc => {
        if (doc.status === "Concluído" && doc.completedAt) {
          const completedAt = new Date(doc.completedAt);
          return completedAt >= date && completedAt < nextMonth;
        }
        if (doc.isArchived && doc.archivedAt) {
          const archivedAt = new Date(doc.archivedAt);
          return archivedAt >= date && archivedAt < nextMonth;
        }
        return false;
      });

      const created = monthDocuments.length;
      const completed = completedInMonth.length;
      const completionRate = created > 0 ? Math.round((completed / created) * 100) : 0;

      monthlyStats.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        created,
        completed,
        completionRate,
      });
    }

    return monthlyStats;
  }

  private async getYearlyComparison(): Promise<YearlyComparison> {
    const allDocuments = await db.select().from(documents);
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Dados do ano atual
    const currentYearDocs = allDocuments.filter(doc => {
      const createdAt = new Date(doc.createdAt);
      return createdAt.getFullYear() === currentYear;
    });

    const currentYearCompleted = allDocuments.filter(doc => {
      if (doc.status === "Concluído" && doc.completedAt) {
        const completedAt = new Date(doc.completedAt);
        return completedAt.getFullYear() === currentYear;
      }
      if (doc.isArchived && doc.archivedAt) {
        const archivedAt = new Date(doc.archivedAt);
        return archivedAt.getFullYear() === currentYear;
      }
      return false;
    });

    // Dados do ano anterior
    const previousYearDocs = allDocuments.filter(doc => {
      const createdAt = new Date(doc.createdAt);
      return createdAt.getFullYear() === previousYear;
    });

    const previousYearCompleted = allDocuments.filter(doc => {
      if (doc.status === "Concluído" && doc.completedAt) {
        const completedAt = new Date(doc.completedAt);
        return completedAt.getFullYear() === previousYear;
      }
      if (doc.isArchived && doc.archivedAt) {
        const archivedAt = new Date(doc.archivedAt);
        return archivedAt.getFullYear() === previousYear;
      }
      return false;
    });

    const currentYearCompletionRate = currentYearDocs.length > 0 
      ? Math.round((currentYearCompleted.length / currentYearDocs.length) * 100) 
      : 0;

    const previousYearCompletionRate = previousYearDocs.length > 0 
      ? Math.round((previousYearCompleted.length / previousYearDocs.length) * 100) 
      : 0;

    // Calcular taxa de crescimento
    const growthRate = previousYearDocs.length > 0 
      ? Math.round(((currentYearDocs.length - previousYearDocs.length) / previousYearDocs.length) * 100)
      : currentYearDocs.length > 0 ? 100 : 0;

    return {
      currentYear: {
        year: currentYear,
        totalDocuments: currentYearDocs.length,
        completedDocuments: currentYearCompleted.length,
        completionRate: currentYearCompletionRate,
      },
      previousYear: {
        year: previousYear,
        totalDocuments: previousYearDocs.length,
        completedDocuments: previousYearCompleted.length,
        completionRate: previousYearCompletionRate,
      },
      growthRate,
    };
  }

  async getDocumentTypeStats(): Promise<DocumentTypeStats> {
    const [certidoesStats] = await db.select({
      count: count(documents.id),
    }).from(documents).where(eq(documents.type, "Certidão"));

    const [relatoriosStats] = await db.select({
      count: count(documents.id),
    }).from(documents).where(eq(documents.type, "Relatório"));

    const [oficiosStats] = await db.select({
      count: count(documents.id),
    }).from(documents).where(eq(documents.type, "Ofício"));

    return {
      certidoes: certidoesStats.count,
      relatorios: relatoriosStats.count,
      oficios: oficiosStats.count,
    };
  }

  async getNextDeadline(): Promise<Date | null> {
    const now = new Date();
    const [result] = await db.select({
      deadline: documents.deadline,
    })
    .from(documents)
    .where(and(
      ne(documents.status, "Concluído"),
      gt(documents.deadline, now)
    ))
    .orderBy(documents.deadline)
    .limit(1);

    return result?.deadline || null;
  }
}

export const storage = new DatabaseStorage();
