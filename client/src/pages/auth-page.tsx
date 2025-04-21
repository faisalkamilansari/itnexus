import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, UserIcon, Mail, Building2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  tenantId: z.number().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "agent", "user"]).default("user"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user",
      organizationName: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    // We don't need to specify tenantId manually, it will be set on the server
    // based on the organization name
    const registrationData = {
      ...data,
      // Make sure we remove any unexpected fields from the form submission
      // that are not part of the InsertUser schema
      organizationName: data.organizationName || undefined
    };
    
    console.log("Registration data:", {
      ...registrationData,
      password: "[REDACTED]" // Don't log passwords in console
    });
    registerMutation.mutate(registrationData);
  };

  // If the user is already logged in, redirect to dashboard
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left column - Forms */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-4 sm:p-6 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">BuopsoIT</h1>
            <p className="text-sm sm:text-base text-gray-500">Enterprise IT Service Management Platform</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your unified IT service management dashboard and start managing your IT operations efficiently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your username" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <LockKeyhole className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                  className="pl-10"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Register your organization and start transforming your IT service management today with our secure multi-tenant platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input className="pl-10" placeholder="Choose a username" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your email" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your organization name" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="First name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Last name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <LockKeyhole className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                  className="pl-10"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Registering..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right column - Feature Showcase */}
      <div className="w-full md:w-1/2 lg:w-3/5 relative overflow-hidden hidden md:block">
        {/* Solid red background with specific hex color */}
        <div className="absolute inset-0" style={{ backgroundColor: '#f10000' }}></div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 sm:p-6">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold mb-1 text-center text-white">
              BuopsoIT Features
            </h1>
            <div className="w-16 sm:w-20 h-1 rounded-full mb-2 sm:mb-3 mx-auto" 
                style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0.5))' }}></div>
            <p className="text-sm sm:text-base text-center text-white/95 mb-4">
              Transform your IT service management experience
            </p>
            
            {/* Feature Cards - Limited to 3 to match login/register form height */}
            <div className="space-y-4">
              <div className="rounded-xl p-4 shadow-xl border border-white/20 transform transition-all duration-300 hover:scale-105" 
                  style={{ backgroundColor: 'rgba(241, 0, 0, 0.7)' }}>
                <h2 className="text-xl font-bold mb-1 text-white">Comprehensive ITSM Solution</h2>
                <p className="text-sm sm:text-base text-white/90">Unified platform for incident management, service requests, change management, and asset tracking</p>
              </div>
              
              <div className="rounded-xl p-4 shadow-xl border border-white/20 transform transition-all duration-300 hover:scale-105" 
                  style={{ backgroundColor: 'rgba(241, 0, 0, 0.85)' }}>
                <h2 className="text-xl font-bold mb-1 text-white">Multi-tenant Architecture</h2>
                <p className="text-sm sm:text-base text-white/90">Securely isolate data between departments or client organizations with enterprise-grade security</p>
              </div>
              
              <div className="rounded-xl p-4 shadow-xl border border-white/20 transform transition-all duration-300 hover:scale-105" 
                  style={{ backgroundColor: 'rgba(241, 0, 0, 0.7)' }}>
                <h2 className="text-xl font-bold mb-1 text-white">Real-time Monitoring</h2>
                <p className="text-sm sm:text-base text-white/90">Advanced dashboards with real-time metrics, alerts, and system health monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}