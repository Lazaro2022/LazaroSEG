import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DocumentWithUser } from "@shared/schema";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DeadlinesPage() {
  const { data: documents, isLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  const now = new Date();
  
  // Categorize documents by deadline urgency
  const categorizedDocuments = documents?.reduce((acc, doc) => {
    if (doc.status === "Concluído") {
      acc.completed.push(doc);
      return acc;
    }

    const deadline = new Date(doc.deadline);
    const daysUntilDeadline = differenceInDays(deadline, now);

    if (isBefore(deadline, now)) {
      acc.overdue.push(doc);
    } else if (daysUntilDeadline <= 2) {
      acc.urgent.push(doc);
    } else if (daysUntilDeadline <= 7) {
      acc.thisWeek.push(doc);
    } else {
      acc.upcoming.push(doc);
    }

    return acc;
  }, {
    overdue: [] as DocumentWithUser[],
    urgent: [] as DocumentWithUser[],
    thisWeek: [] as DocumentWithUser[],
    upcoming: [] as DocumentWithUser[],
    completed: [] as DocumentWithUser[],
  }) || {
    overdue: [],
    urgent: [],
    thisWeek: [],
    upcoming: [],
    completed: [],
  };

  const getStatusBadge = (document: DocumentWithUser) => {
    const deadline = new Date(document.deadline);
    const daysUntilDeadline = differenceInDays(deadline, now);

    if (document.status === "Concluído") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      );
    }

    if (isBefore(deadline, now)) {
      return (
        <Badge className="status-urgent">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vencido há {Math.abs(daysUntilDeadline)} dias
        </Badge>
      );
    }

    if (daysUntilDeadline <= 2) {
      return (
        <Badge className="status-urgent">
          <Clock className="w-3 h-3 mr-1" />
          {daysUntilDeadline === 0 ? "Vence hoje" : `${daysUntilDeadline} dias restantes`}
        </Badge>
      );
    }

    return (
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
        <Clock className="w-3 h-3 mr-1" />
        {daysUntilDeadline} dias restantes
      </Badge>
    );
  };

  const DocumentCard = ({ document }: { document: DocumentWithUser }) => (
    <div className="glass-morphism p-4 rounded-lg border border-white/10 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-mono text-blue-400 text-sm">{document.processNumber}</p>
          <p className="font-medium text-white">{document.prisonerName}</p>
          <p className="text-sm text-gray-400">{document.type}</p>
        </div>
        {getStatusBadge(document)}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-400">
          <Calendar className="w-4 h-4 mr-1" />
          {format(new Date(document.deadline), "dd/MM/yyyy", { locale: ptBR })}
        </div>
        {document.assignedUser && (
          <div className="text-gray-400">
            Responsável: {document.assignedUser.name}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col">
          <Header />
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-700 rounded w-1/4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 ml-64 flex flex-col">
        <Header />
        
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <h1 className="text-3xl font-bold">Controle de Prazos</h1>
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-morphism border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Vencidos</p>
                    <p className="text-2xl font-bold text-red-500">{categorizedDocuments.overdue.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Urgentes</p>
                    <p className="text-2xl font-bold text-orange-500">{categorizedDocuments.urgent.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Esta Semana</p>
                    <p className="text-2xl font-bold text-yellow-500">{categorizedDocuments.thisWeek.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Concluídos</p>
                    <p className="text-2xl font-bold text-green-500">{categorizedDocuments.completed.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Documents */}
          {categorizedDocuments.overdue.length > 0 && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center text-red-400">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Documentos Vencidos ({categorizedDocuments.overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedDocuments.overdue.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Urgent Documents */}
          {categorizedDocuments.urgent.length > 0 && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-400">
                  <Clock className="w-5 h-5 mr-2" />
                  Documentos Urgentes ({categorizedDocuments.urgent.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedDocuments.urgent.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* This Week Documents */}
          {categorizedDocuments.thisWeek.length > 0 && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-400">
                  <Calendar className="w-5 h-5 mr-2" />
                  Vencimentos desta Semana ({categorizedDocuments.thisWeek.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedDocuments.thisWeek.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Documents */}
          {categorizedDocuments.upcoming.length > 0 && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-400">
                  <Calendar className="w-5 h-5 mr-2" />
                  Próximos Vencimentos ({categorizedDocuments.upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedDocuments.upcoming.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {documents?.length === 0 && (
            <Card className="glass-morphism">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhum documento encontrado</h3>
                <p className="text-gray-400">Não há documentos com prazos para controlar no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}