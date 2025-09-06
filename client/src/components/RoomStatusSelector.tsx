import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Home, 
  Settings,
  DoorOpen,
  Sparkles
} from "lucide-react";

interface RoomStatusSelectorProps {
  room: any;
  showButton?: boolean;
  compact?: boolean;
}

const ROOM_STATUSES = [
  { value: "dirty", label: "Dirty", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  { value: "ready", label: "READY", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  { value: "roll", label: "ROLL", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  { value: "out", label: "OUT", color: "bg-gray-100 text-gray-800", icon: DoorOpen },
  { value: "clean_inspected", label: "Clean & Inspected", color: "bg-green-100 text-green-800", icon: Sparkles },
  { value: "out_of_order", label: "Out of Order", color: "bg-red-100 text-red-800", icon: Settings },
  { value: "maintenance", label: "Maintenance", color: "bg-amber-100 text-amber-800", icon: Settings },
];

export default function RoomStatusSelector({ room, showButton = true, compact = false }: RoomStatusSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(room.status);
  const [statusNotes, setStatusNotes] = useState("");

  const currentStatus = ROOM_STATUSES.find(s => s.value === room.status) || ROOM_STATUSES[0];
  const selectedStatusObj = ROOM_STATUSES.find(s => s.value === selectedStatus) || currentStatus;

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      apiRequest("PATCH", `/api/rooms/${room.id}/status`, { status, notes }),
    onSuccess: () => {
      toast({ title: "Room status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setShowStatusDialog(false);
      setStatusNotes("");
    },
    onError: () => {
      toast({ title: "Failed to update room status", variant: "destructive" });
    },
  });

  // Check if user can update room status
  const canUpdateStatus = user?.role && [
    "site_admin", 
    "head_housekeeper", 
    "room_attendant", 
    "maintenance", 
    "front_desk_manager"
  ].includes(user.role);

  if (compact) {
    const Icon = currentStatus.icon;
    return (
      <Badge className={`${currentStatus.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {currentStatus.label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${currentStatus.color} flex items-center gap-1`}>
        <currentStatus.icon className="h-3 w-3" />
        {currentStatus.label}
      </Badge>
      
      {showButton && canUpdateStatus && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStatusDialog(true)}
          data-testid={`update-status-${room.number}`}
        >
          Update Status
        </Button>
      )}

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Room {room.number} Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Status</label>
              <div className="mt-2">
                <Badge className={`${currentStatus.color} flex items-center gap-1 w-fit`}>
                  <currentStatus.icon className="h-3 w-3" />
                  {currentStatus.label}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">New Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_STATUSES.map((status) => {
                    const Icon = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {status.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add notes about the status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="mt-2"
                data-testid="status-notes-input"
              />
            </div>

            {selectedStatus !== room.status && (
              <Card className="border-dashed bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <selectedStatusObj.icon className="h-4 w-4" />
                    <span>Status will change to: <strong>{selectedStatusObj.label}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusDialog(false);
                  setSelectedStatus(room.status);
                  setStatusNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateStatusMutation.mutate({
                  status: selectedStatus,
                  notes: statusNotes.trim() || undefined
                })}
                disabled={selectedStatus === room.status || updateStatusMutation.isPending}
                data-testid="confirm-status-update"
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}