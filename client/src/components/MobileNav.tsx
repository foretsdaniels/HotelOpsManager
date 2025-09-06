import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  CheckSquare, 
  ClipboardCheck, 
  BarChart3 
} from "lucide-react";

const mobileNavItems = [
  {
    href: "/room-status",
    label: "Room Status",
    shortLabel: "Rooms",
    icon: CheckSquare,
    roles: ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"],
  },
  {
    href: "/tasks",
    label: "Special Tasks",
    shortLabel: "Tasks",
    icon: ClipboardCheck,
    roles: ["site_admin", "head_housekeeper", "room_attendant", "front_desk_manager"],
  },
  {
    href: "/inspections",
    label: "Inspections",
    shortLabel: "Inspect",
    icon: BarChart3,
    roles: ["site_admin", "head_housekeeper", "front_desk_manager"],
  },
];

export default function MobileNav() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const hasAccess = (requiredRoles: string[]) => {
    return user?.role && requiredRoles.includes(user.role);
  };

  const isActive = (href: string) => {
    return location === href || (href !== "/" && location.startsWith(href));
  };

  return (
    <nav className="mobile-nav lg:hidden">
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
          if (!hasAccess(item.roles)) return null;
          
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "touch-target flex flex-col items-center justify-center px-3 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
