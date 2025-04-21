import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function DebugPage() {
  const { toast } = useToast();
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Add useEffect to check authentication status on page load
  useEffect(() => {
    checkAuthStatus();
    checkSession();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/user", {
        method: "GET",
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setAuthStatus({
          status: "Authenticated",
          user: data
        });
        console.log("Authentication check successful:", data);
      } else {
        const errorText = await res.text();
        setAuthStatus({
          status: "Not authenticated",
          error: errorText
        });
        console.log("Authentication check failed:", res.status, errorText);
      }
    } catch (error) {
      console.error("Authentication check error:", error);
      setAuthStatus({
        status: "Error",
        error: String(error)
      });
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch("/api/session-info", {
        method: "GET",
        credentials: "include",
      });
      
      const data = await res.json();
      setSessionInfo(data);
      console.log("Session info:", data);
    } catch (error) {
      console.error("Session check error:", error);
      setSessionInfo({
        error: String(error)
      });
    }
  };

  const handleLogin = async () => {
    console.log(`Attempting login with: ${username} / ${password}`);
    try {
      loginMutation.mutate(
        { username, password },
        {
          onSuccess: () => {
            toast({
              title: "Login successful",
              variant: "default",
            });
            // Check authentication status after successful login
            setTimeout(() => {
              checkAuthStatus();
              checkSession();
            }, 500);
          },
          onError: (error: Error) => {
            console.error("Login error:", error);
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      );
    } catch (error) {
      console.error("Login attempt error:", error);
    }
  };

  const handleRegister = async () => {
    console.log(`Attempting register with: ${username} / ${password}`);
    try {
      registerMutation.mutate(
        { 
          username, 
          password, 
          email: `${username}@example.com`,
          tenantId: 1,
          role: "user",
          firstName: username,
          lastName: "User",
        },
        {
          onSuccess: () => {
            toast({
              title: "Registration successful",
              variant: "default",
            });
            // Check authentication status after successful registration
            setTimeout(() => {
              checkAuthStatus();
              checkSession();
            }, 500);
          },
          onError: (error: Error) => {
            console.error("Registration error:", error);
            toast({
              title: "Registration failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      );
    } catch (error) {
      console.error("Registration attempt error:", error);
    }
  };

  const handleLogout = async () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout successful",
          variant: "default",
        });
        // Check authentication status after successful logout
        setTimeout(() => {
          checkAuthStatus();
          checkSession();
        }, 500);
      },
      onError: (error) => {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleDirectLogin = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Direct login successful:", data);
        toast({
          title: "Direct login successful",
          variant: "default",
        });
        // Check authentication after login
        setTimeout(() => {
          checkAuthStatus();
          checkSession();
        }, 500);
      } else {
        const errorText = await res.text();
        console.error("Direct login failed:", res.status, errorText);
        toast({
          title: "Direct login failed",
          description: `${res.status}: ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Direct login error:", error);
      toast({
        title: "Direct login error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Form */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleLogin} variant="default">
                Login (Auth Hook)
              </Button>
              <Button onClick={handleDirectLogin} variant="outline">
                Login (Direct API)
              </Button>
              <Button onClick={handleRegister} variant="secondary">
                Register
              </Button>
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={checkAuthStatus} variant="outline">
                Check Auth Status
              </Button>
              <Button onClick={checkSession} variant="outline">
                Check Session
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Auth Hook State</h3>
                <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-40 text-sm">
                  {JSON.stringify({
                    user: user, 
                    isLoading: loginMutation.isPending,
                    loginStatus: loginMutation.status,
                    registerStatus: registerMutation.status,
                    logoutStatus: logoutMutation.status
                  }, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">API Auth Status</h3>
                <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-40 text-sm">
                  {JSON.stringify(authStatus, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Session Info</h3>
                <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-40 text-sm">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}