import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, UserMinus, UserPlus } from "lucide-react";
import type { User as UserType, RoomAssignment } from "@shared/schema";

interface RoomAssignmentManagerProps {
  roomId: string;
  roomNumber: string;
}

export default function RoomAssignmentManager({ roomId, roomNumber }: RoomAssignmentManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch users
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch room assignments
  const { data: assignments = [] } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/room-assignments"],
  });

  // Find current assignment for this room
  const currentAssignment = assignments.find(a => a.roomId === roomId);
  const assignedUser = currentAssignment ? users.find(u => u.id === currentAssignment.userId) : null;

  // Filter users who can be assigned to rooms (exclude site_admin)
  const assignableUsers = users.filter(u => 
    u.role !== "site_admin" && u.id !== currentAssignment?.userId
  );

  // Check if current user can manage assignments
  const canManageAssignments = user?.role && [
    "site_admin", 
    "head_housekeeper", 
    "front_desk_manager"
  ].includes(user.role);

  const createAssignmentMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("POST", "/api/room-assignments", {
        roomId,
        userId,
      }),
    onSuccess: () => {
      toast({ title: "Room assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/room-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setSelectedUserId("");
    },
    onError: () => {
      toast({ title: "Failed to assign room", variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/room-assignments/${roomId}/${currentAssignment!.userId}`),
    onSuccess: () => {
      toast({ title: "Room unassigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/room-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    },
    onError: () => {
      toast({ title: "Failed to unassign room", variant: "destructive" });
    },
  });

  if (!canManageAssignments) {
    return (
      <div>
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          Room Assignment
        </h3>
        {assignedUser ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {assignedUser.name}
            </Badge>
            <span className="text-xs text-muted-foreground">({assignedUser.role.replace("_", " ")})</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not assigned</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <User className="w-4 h-4" />
        Room Assignment
      </h3>
      
      <div className="space-y-3">
        {/* Current Assignment */}
        {assignedUser ? (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {assignedUser.name}
              </Badge>
              <span className="text-xs text-muted-foreground">({assignedUser.role.replace("_", " ")})</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteAssignmentMutation.mutate()}
              disabled={deleteAssignmentMutation.isPending}
              className="flex items-center gap-1"
              data-testid={`unassign-room-${roomNumber}`}
            >
              <UserMinus className="w-3 h-3" />
              Unassign
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
            Room is not currently assigned
          </p>
        )}

        {/* Assignment Form */}
        <div className="flex gap-2">
          <Select 
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
            disabled={createAssignmentMutation.isPending}
          >
            <SelectTrigger className="flex-1" data-testid={`assign-user-select-${roomNumber}`}>
              <SelectValue placeholder="Select staff member to assign" />
            </SelectTrigger>
            <SelectContent>
              {assignableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role.replace("_", " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => createAssignmentMutation.mutate(selectedUserId)}
            disabled={!selectedUserId || createAssignmentMutation.isPending}
            className="flex items-center gap-1"
            data-testid={`assign-room-${roomNumber}`}
          >
            <UserPlus className="w-3 h-3" />
            {currentAssignment ? "Reassign" : "Assign"}
          </Button>
        </div>

        {selectedUserId && currentAssignment && (
          <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
            <strong>Note:</strong> This will reassign the room from {assignedUser?.name} to the selected staff member.
          </p>
        )}
      </div>
    </div>
  );
}