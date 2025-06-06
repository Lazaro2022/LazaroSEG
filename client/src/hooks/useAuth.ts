import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  initials: string;
}

export function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response as User;
      } catch (error: any) {
        if (error.message?.includes("401")) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  const logout = () => {
    logoutMutation.mutate();
  };

  const refetchUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return {
    user: user as User | null,
    isLoading: !isInitialized,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    logout,
    refetchUser,
    error,
  };
}