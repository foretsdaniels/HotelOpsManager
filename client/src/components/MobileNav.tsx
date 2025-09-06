import { useLocation } from "wouter";
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
  },
  {
    href: "/tasks",
    label: "Special Tasks",
    shortLabel: "Tasks",
    icon: ClipboardCheck,
  },
  {
    href: "/inspections",
    label: "Inspections",
    shortLabel: "Inspect",
    icon: BarChart3,
  },
];

export default function MobileNav() {
  const [location, navigate] = useLocation();

  const isActive = (href: string) => {
    return location === href || (href !== "/" && location.startsWith(href));
  };

  return (
    <nav className="mobile-nav lg:hidden">
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
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
