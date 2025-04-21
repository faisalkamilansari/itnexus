import { 
  Home,
  LayoutDashboard,
  AlertTriangle,
  HeadphonesIcon,
  GitBranch,
  ActivityIcon,
  Database,
  BarChart,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  Menu
} from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentPath: string;
  tenantName?: string;
  tenantPlan?: string;
  userName?: string;
  userRole?: string;
  isMobile?: boolean;
}

// Helper function to get user initials from name
const getUserInitials = (name?: string): string => {
  if (!name) return "U";
  
  // Split by spaces to get parts
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Just use first two letters of the single name
    return name.substring(0, 2).toUpperCase();
  } else {
    // Use first letter of first name and first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
};

export default function Sidebar({
  open,
  onToggle,
  currentPath,
  tenantName = "Company",
  tenantPlan = "Plan",
  userName = "User",
  userRole = "Role",
  isMobile = false
}: SidebarProps) {
  const { logoutMutation } = useAuth();

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard className="text-xl w-6" />
    },
    {
      name: "Incidents",
      path: "/incidents",
      icon: <AlertTriangle className="text-xl w-6" />,
      badge: 7
    },
    {
      name: "Service Requests",
      path: "/service-requests",
      icon: <HeadphonesIcon className="text-xl w-6" />,
      badge: 4
    },
    {
      name: "Changes",
      path: "/changes",
      icon: <GitBranch className="text-xl w-6" />
    },
    {
      name: "Monitoring",
      path: "/monitoring",
      icon: <ActivityIcon className="text-xl w-6" />
    },
    {
      name: "Assets",
      path: "/assets",
      icon: <Database className="text-xl w-6" />
    },
    {
      name: "Reports",
      path: "/reports",
      icon: <BarChart className="text-xl w-6" />
    }
  ];

  const settingsItems: NavItem[] = [
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="text-xl w-6" />
    },
    {
      name: "Help & Support",
      path: "/help-support",
      icon: <HelpCircle className="text-xl w-6" />
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo and header */}
      <div className="flex items-center border-b border-gray-200 h-16 px-4">
        <Link href="/">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 bg-primary-500 rounded-md flex items-center justify-center text-white font-bold">
              B
            </div>
            <h1 className="ml-2 font-bold text-primary-600 text-lg">
              BuopsoIT
            </h1>
          </div>
        </Link>
        {isMobile && (
          <button 
            onClick={onToggle}
            className="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Tenant Selector */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">
            {getUserInitials(tenantName)}
          </div>
          <div className="ml-2 overflow-hidden">
            <div className="text-sm font-medium truncate">{tenantName}</div>
            <div className="text-xs text-gray-500 truncate">{tenantPlan}</div>
          </div>
          <button className="ml-auto text-gray-500 hover:text-gray-700">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <div
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors
                    ${currentPath === item.path 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="ml-3 flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto inline-flex items-center justify-center h-5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-danger-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="mt-6 px-2">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              System
            </h3>
          </div>
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors
                      ${currentPath === item.path 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3">{item.name}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            {/* Only use user-provided images, no external random sources */}
            <AvatarFallback className="bg-primary-100 text-primary-800">
              {getUserInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-2 overflow-hidden">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-gray-500 truncate capitalize">{userRole}</div>
          </div>
          <div className="ml-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-8 w-8"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}