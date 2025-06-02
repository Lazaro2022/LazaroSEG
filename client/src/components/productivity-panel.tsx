import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { ServerWithUser } from "@shared/schema";

export function ProductivityPanel() {
  const { data: servers, isLoading } = useQuery<ServerWithUser[]>({
    queryKey: ["/api/servers"],
  });

  if (isLoading) {
    return (
      <Card className="glass-morphism">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Produtividade por Servidor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers?.map((server) => {
            // Generate consistent gradient colors based on user ID
            const gradients = [
              'from-blue-500 to-purple-600',
              'from-green-500 to-teal-600', 
              'from-yellow-500 to-orange-600',
              'from-red-500 to-pink-600',
              'from-purple-500 to-indigo-600',
              'from-teal-500 to-cyan-600',
            ];
            const gradientClass = gradients[server.userId % gradients.length];
            
            const completionColor = server.completionPercentage >= 90 
              ? 'text-green-500' 
              : server.completionPercentage >= 75 
                ? 'text-orange-500' 
                : 'text-red-500';

            return (
              <div 
                key={server.id} 
                className="productivity-card p-4 rounded-lg border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`bg-gradient-to-r ${gradientClass} text-white text-sm font-semibold`}>
                      {server.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white">{server.user.name}</p>
                    <p className="text-xs text-gray-400">{server.user.role}</p>
                    <p className="text-xs text-gray-400">{server.totalDocuments} documentos</p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${completionColor}`}>
                      {server.completionPercentage}%
                    </p>
                    <div className="w-16 mt-1">
                      <Progress 
                        value={server.completionPercentage} 
                        className="h-1 bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
