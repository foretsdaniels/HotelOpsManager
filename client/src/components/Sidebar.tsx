import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CheckSquare, 
  ClipboardCheck, 
  ClipboardList,
  Users, 
  Search, 
  BarChart3, 
  AlertCircle, 
  Settings,
  Hotel,
  LogOut,
  Clock
} from "lucide-react";

const navigationItems = [
  {
    href: "/room-status",
    label: "Room Status",
    icon: CheckSquare,
    roles: ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"],
  },
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"],
  },
  {
    href: "/tasks",
    label: "Special Tasks",
    icon: ClipboardList,
    roles: ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"],
  },
  {
    href: "/inspections",
    label: "Inspections",
    icon: ClipboardCheck,
    roles: ["site_admin", "head_housekeeper"],
  },
  {
    href: "/ra-monitor",
    label: "RA Monitor",
    icon: Users,
    roles: ["site_admin", "head_housekeeper", "front_desk_manager"],
  },
  {
    href: "/front-desk",
    label: "Front Desk",
    icon: Hotel,
    roles: ["site_admin", "front_desk_manager"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["site_admin", "head_housekeeper", "front_desk_manager"],
  },
];

const adminItems = [
  {
    href: "/panic-log",
    label: "Panic Log",
    icon: AlertCircle,
    roles: ["site_admin", "head_housekeeper", "front_desk_manager"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["site_admin"],
  },
  {
    href: "/daily-reset",
    label: "Daily Reset",
    icon: Clock,
    roles: ["site_admin"],
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const hasAccess = (requiredRoles: string[]) => {
    return user?.role && requiredRoles.includes(user.role);
  };

  const isActive = (href: string) => {
    return location === href || (href !== "/" && location.startsWith(href));
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn("sidebar", isOpen && "open")}>
        <div className="p-4">
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              if (!hasAccess(item.roles)) return null;
              
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            <div className="border-t border-border my-4" />
            
            {adminItems.map((item) => {
              if (!hasAccess(item.roles)) return null;
              
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            <div className="border-t border-border my-4" />
            
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
