import { users, documents, servers, type User, type InsertUser, type Document, type InsertDocument, type Server, type InsertServer, type DocumentWithUser, type ServerWithUser, type DashboardStats, type DocumentTypeStats } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Documents
  getDocument(id: number): Promise<DocumentWithUser | undefined>;
  getAllDocuments(): Promise<DocumentWithUser[]>;
  getRecentDocuments(limit?: number): Promise<DocumentWithUser[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private servers: Map<number, Server>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentServerId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.servers = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentServerId = 1;

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create users
    const sampleUsers: InsertUser[] = [
      { username: "ana.costa", password: "123456", name: "Ana Costa", role: "Administradora", initials: "AC" },
      { username: "marco.silva", password: "123456", name: "Marco Silva", role: "Assistente Social", initials: "MS" },
      { username: "lucia.ferreira", password: "123456", name: "Lucia Ferreira", role: "Psicóloga", initials: "LF" },
      { username: "roberto.castro", password: "123456", name: "Roberto Castro", role: "Advogado", initials: "RC" },
    ];

    sampleUsers.forEach(user => {
      const id = this.currentUserId++;
      this.users.set(id, { ...user, id });
    });

    // Create documents
    const now = new Date();
    const sampleDocuments: InsertDocument[] = [
      {
        processNumber: "2024.001.0156",
        prisonerName: "João Silva Santos",
        type: "Certidão",
        deadline: new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)), // 1 day from now
        status: "Urgente",
        assignedTo: 1,
      },
      {
        processNumber: "2024.001.0157",
        prisonerName: "Maria Oliveira Costa",
        type: "Relatório",
        deadline: new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)), // 3 days from now
        status: "Em Andamento",
        assignedTo: 2,
      },
      {
        processNumber: "2024.001.0158",
        prisonerName: "Carlos Eduardo Lima",
        type: "Ofício",
        deadline: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
        status: "Concluído",
        assignedTo: 3,
      },
      {
        processNumber: "2024.001.0159",
        prisonerName: "Ana Paula Rodrigues",
        type: "Certidão",
        deadline: new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)), // 5 days from now
        status: "Em Andamento",
        assignedTo: 1,
      },
      {
        processNumber: "2024.001.0160",
        prisonerName: "Fernando Santos Pereira",
        type: "Relatório",
        deadline: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)), // 2 days ago (overdue)
        status: "Vencido",
        assignedTo: 4,
      },
    ];

    sampleDocuments.forEach(doc => {
      const id = this.currentDocumentId++;
      this.documents.set(id, { 
        ...doc, 
        id, 
        createdAt: new Date(),
        completedAt: doc.status === "Concluído" ? new Date() : null,
        assignedTo: doc.assignedTo || null
      });
    });

    // Create servers/productivity data
    const sampleServers: InsertServer[] = [
      { userId: 1, totalDocuments: 127, completedDocuments: 119, completionPercentage: 94 },
      { userId: 2, totalDocuments: 98, completedDocuments: 85, completionPercentage: 87 },
      { userId: 3, totalDocuments: 156, completedDocuments: 119, completionPercentage: 76 },
      { userId: 4, totalDocuments: 89, completedDocuments: 61, completionPercentage: 68 },
    ];

    sampleServers.forEach(server => {
      const id = this.currentServerId++;
      this.servers.set(id, { 
        ...server, 
        id,
        totalDocuments: server.totalDocuments || 0,
        completedDocuments: server.completedDocuments || 0,
        completionPercentage: server.completionPercentage || 0
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Document methods
  async getDocument(id: number): Promise<DocumentWithUser | undefined> {
    const doc = this.documents.get(id);
    if (!doc) return undefined;

    const assignedUser = doc.assignedTo ? await this.getUser(doc.assignedTo) : undefined;
    return { ...doc, assignedUser };
  }

  async getAllDocuments(): Promise<DocumentWithUser[]> {
    const docs = Array.from(this.documents.values());
    const result: DocumentWithUser[] = [];

    for (const doc of docs) {
      const assignedUser = doc.assignedTo ? await this.getUser(doc.assignedTo) : undefined;
      result.push({ ...doc, assignedUser });
    }

    return result;
  }

  async getRecentDocuments(limit: number = 10): Promise<DocumentWithUser[]> {
    const allDocs = await this.getAllDocuments();
    return allDocs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date(),
      completedAt: null,
      assignedTo: insertDocument.assignedTo || null
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    if (!doc) return undefined;

    const updatedDoc = { ...doc, ...updates };
    this.documents.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Server methods
  async getServer(id: number): Promise<ServerWithUser | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;

    const user = await this.getUser(server.userId);
    if (!user) return undefined;

    return { ...server, user };
  }

  async getAllServers(): Promise<ServerWithUser[]> {
    const servers = Array.from(this.servers.values());
    const result: ServerWithUser[] = [];

    for (const server of servers) {
      const user = await this.getUser(server.userId);
      if (user) {
        result.push({ ...server, user });
      }
    }

    return result;
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const id = this.currentServerId++;
    const server: Server = { 
      ...insertServer, 
      id,
      totalDocuments: insertServer.totalDocuments || 0,
      completedDocuments: insertServer.completedDocuments || 0,
      completionPercentage: insertServer.completionPercentage || 0
    };
    this.servers.set(id, server);
    return server;
  }

  async updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;

    const updatedServer = { ...server, ...updates };
    this.servers.set(id, updatedServer);
    return updatedServer;
  }

  // Dashboard stats methods
  async getDashboardStats(): Promise<DashboardStats> {
    const docs = Array.from(this.documents.values());
    
    return {
      totalDocuments: docs.length,
      inProgress: docs.filter(d => d.status === "Em Andamento").length,
      completed: docs.filter(d => d.status === "Concluído").length,
      overdue: docs.filter(d => d.status === "Vencido").length,
    };
  }

  async getDocumentTypeStats(): Promise<DocumentTypeStats> {
    const docs = Array.from(this.documents.values());
    
    return {
      certidoes: docs.filter(d => d.type === "Certidão").length,
      relatorios: docs.filter(d => d.type === "Relatório").length,
      oficios: docs.filter(d => d.type === "Ofício").length,
    };
  }

  async getNextDeadline(): Promise<Date | null> {
    const docs = Array.from(this.documents.values());
    const now = new Date();
    
    const upcomingDocs = docs
      .filter(d => d.status !== "Concluído" && d.deadline > now)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    
    return upcomingDocs.length > 0 ? upcomingDocs[0].deadline : null;
  }
}

export const storage = new MemStorage();
