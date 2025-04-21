import { useState } from "react";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  ChevronDown,
  User,
  Settings as SettingsIcon,
  LogOut as LogOutIcon,
  Menu,
  X,
  AlertTriangle,
  HeadphonesIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

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

interface TopBarProps {
  userName?: string;
  userRole?: string;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function TopBar({ 
  userName = "User", 
  userRole = "Role",
  onToggleSidebar,
  sidebarOpen
}: TopBarProps) {
  const { logoutMutation } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 sticky top-0 z-10">
      {/* Mobile menu button */}
      <button 
        className="lg:hidden p-2 mr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>
      
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden md:block">
          <Input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 text-sm focus:ring-primary-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="relative">
          <button 
            className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none" 
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>
          
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {/* Sample notifications */}
                  <div className="p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">New incident reported</p>
                        <p className="text-xs text-gray-500 mt-1">Network outage in data center</p>
                        <p className="text-xs text-gray-400 mt-1">10 minutes ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                        <HeadphonesIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Service request assigned</p>
                        <p className="text-xs text-gray-500 mt-1">Laptop replacement request</p>
                        <p className="text-xs text-gray-400 mt-1">30 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                  <button 
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    onClick={() => {
                      setShowNotifications(false);
                      window.location.href = "/notifications";
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="relative">
          <button 
            className="hidden md:block p-2 text-gray-500 hover:text-gray-700 focus:outline-none" 
            aria-label="Help"
            onClick={() => setShowHelpMenu(!showHelpMenu)}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          
          {showHelpMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowHelpMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border border-gray-200 overflow-hidden">
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setShowHelpMenu(false);
                      window.location.href = "/help/documentation";
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    Documentation
                  </button>
                  <button 
                    onClick={() => {
                      setShowHelpMenu(false);
                      window.location.href = "/help/support";
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Support Center
                  </button>
                  <button 
                    onClick={() => {
                      setShowHelpMenu(false);
                      window.open("https://buopso.com/training", "_blank");
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                      <line x1="6" y1="1" x2="6" y2="4"></line>
                      <line x1="10" y1="1" x2="10" y2="4"></line>
                      <line x1="14" y1="1" x2="14" y2="4"></line>
                    </svg>
                    Training Videos
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="hidden md:block border-l border-gray-200 h-6 mx-2"></div>
        
        <div className="relative">
          <button 
            className="flex items-center focus:outline-none text-left rounded-full hover:bg-gray-100 p-1"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            <Avatar className="h-8 w-8">
              {/* Only use user-provided images, not random ones */}
              <AvatarFallback className="bg-primary-100 text-primary-800">
                {getUserInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 hidden md:block">
              <div className="text-sm font-medium text-gray-700 line-clamp-1">{userName}</div>
              <div className="text-xs text-gray-500 capitalize line-clamp-1">{userRole}</div>
            </div>
            <ChevronDown className="ml-1 h-4 w-4 text-gray-500 hidden md:block" />
          </button>
          
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200 overflow-hidden">
                <div className="py-1">
                  <button 
                    onClick={() => window.location.href = "/settings?tab=profile"}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Your Profile
                  </button>
                  <button 
                    onClick={() => window.location.href = "/settings"}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-gray-100"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
