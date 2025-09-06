import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: string;
  className?: string;
}

const statusConfig = {
  pending: "status-pending",
  in_progress: "status-in-progress", 
  completed: "status-completed",
  failed: "status-failed",
  paused: "status-paused",
};

export default function StatusChip({ status, className }: StatusChipProps) {
  // Handle null or undefined status
  if (!status) {
    status = "pending";
  }
  
  const statusClass = statusConfig[status as keyof typeof statusConfig] || "status-pending";
  
  const displayStatus = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span 
      className={cn("status-chip", statusClass, className)}
      data-testid={`status-${status}`}
    >
      {displayStatus}
    </span>
  );
}
