import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if user is already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ username, password });
      toast({
        title: "Login successful",
        description: "Welcome back to BuopsoIT!",
      });
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync({
        username: regUsername,
        password: regPassword,
        email,
        firstName,
        lastName,
        role: "user",
        tenantId: 1, // Default tenant
      });
      toast({
        title: "Registration successful",
        description: "Welcome to BuopsoIT!",
      });
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-950 to-slate-800 p-4">
      <div className="w-full max-w-5xl flex flex-col-reverse md:flex-row gap-8 items-center">
        {/* Left side - Login/Register form */}
        <Card className="w-full md:w-1/2 bg-background/95 backdrop-blur">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <CardDescription className="pt-4">
                Access your account to manage IT services and resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="Choose a username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Choose a password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-sm text-muted-foreground">
              <p>Default admin account: username: admin, password: admin123</p>
            </CardFooter>
          </Tabs>
        </Card>

        {/* Right side - Hero section */}
        <div className="w-full md:w-1/2 text-white space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-cyan-200">
              BuopsoIT
            </h1>
            <p className="text-xl font-medium text-blue-100">
              Your complete IT Service Management Platform
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-blue-50">
              Streamline IT operations, improve service quality, and make better-informed decisions with our
              comprehensive ITSM solution.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-blue-300"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm">Incident Management & Resolution</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-blue-300"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm">Service Request Management</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-blue-300"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm">Change Management & Implementation</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-blue-300"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm">Asset Tracking & Management</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-blue-300"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm">Real-time Monitoring & Alerting</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}