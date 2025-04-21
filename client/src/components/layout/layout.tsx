import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import TopBar from "./topbar";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // State for sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Track screen size
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [location] = useLocation();
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  // Function to track screen size
  const updateScreenWidth = () => {
    setScreenWidth(window.innerWidth);
  };

  // Add window resize listener
  useEffect(() => {
    // Initial check
    updateScreenWidth();
    // Update on resize
    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  // Set sidebar default state based on screen size
  useEffect(() => {
    // Auto-collapse on small screens, auto-expand on large screens
    setSidebarOpen(screenWidth >= 1024);
  }, [screenWidth]);

  // Toggle sidebar open/closed
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // User display name
  const displayName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ""}` 
    : user?.username;
    
  // Debug logging
  useEffect(() => {
    if (user) {
      console.log("User data in layout:", {
        id: user.id,
        username: user.username,
        tenantId: user.tenantId
      });
    }
    
    if (tenant) {
      console.log("Tenant data in layout:", {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain
      });
    }
  }, [user, tenant]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Using absolute positioning on mobile for overlay effect */}
      <div 
        className={`
          fixed inset-0 bg-gray-800 bg-opacity-50 z-20 transition-opacity duration-200 lg:hidden
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={toggleSidebar}
      />
      
      <div 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 
          transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          open={sidebarOpen}
          onToggle={toggleSidebar}
          currentPath={location}
          userName={displayName}
          userRole={user?.role}
          tenantName={tenant?.name || "Loading organization..."} 
          tenantPlan="Enterprise Plan"
          isMobile={screenWidth < 1024}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <TopBar
          userName={displayName}
          userRole={user?.role}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
