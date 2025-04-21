import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, any>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt with:", { username: credentials.username });
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        console.log("Login successful, received user data:", userData);
        return userData;
      } catch (err) {
        console.error("Login error in mutationFn:", err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login onSuccess handler, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);

      // Force a full page refresh to ensure all components get updated with auth state
      // This is simpler than trying to handle state updates in all components
      window.location.href = '/';
      
      toast({
        title: "Login successful",
        description: `Welcome, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login onError handler:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: any) => {
      console.log("Registration attempt with:", { 
        username: credentials.username,
        email: credentials.email
      });
      try {
        // We're sending the data as is, including organizationName if present
        // The server will handle tenant creation and assignment
        const res = await apiRequest("POST", "/api/register", credentials);
        const userData = await res.json();
        console.log("Registration successful, received user data:", userData);
        return userData;
      } catch (err) {
        console.error("Registration error in mutationFn:", err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log("Registration onSuccess handler, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a full page refresh to ensure all components get updated with auth state
      window.location.href = '/';
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration onError handler:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
