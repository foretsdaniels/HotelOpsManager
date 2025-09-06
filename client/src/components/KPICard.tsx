import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label: string;
  };
  className?: string;
}

export default function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  return (
    <Card className={className} data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground" data-testid="kpi-value">
              {value}
            </p>
          </div>
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className={getTrendColor(trend.direction)}>
              {getTrendIcon(trend.direction)} {trend.value}
            </span>{" "}
            {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
