import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { Tenant } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useEffect } from "react";

export const useTenant = () => {
  const { user, isLoading: isUserLoading } = useAuth();
  
  const {
    data: tenant,
    isLoading,
    error,
    refetch
  } = useQuery<Tenant | undefined, Error>({
    queryKey: ["/api/tenant"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // Only fetch if user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });

  // Refetch tenant data when user changes
  useEffect(() => {
    if (user) {
      refetch();
    } else {
      // Clear tenant data when user logs out
      queryClient.setQueryData(["/api/tenant"], null);
    }
  }, [user?.id, refetch]);

  // Add better console logging
  if (tenant) {
    console.log("Tenant data loaded:", tenant);
  }

  return {
    tenant,
    isLoading: isLoading || isUserLoading,
    error
  };
};