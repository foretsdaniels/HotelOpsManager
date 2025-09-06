import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import StatusChip from "@/components/StatusChip";
import { apiRequest, invalidateQueries, uploadFile } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DoorOpen, ClipboardList, Plus, Check, X, Camera, MessageSquare, PenTool, Eye, Trash2, Archive, MoreHorizontal } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  passed?: boolean;
  notes?: string;
  photos?: string[];
}

export default function Inspections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInspectionType, setSelectedInspectionType] = useState<"room" | "process" | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [activeInspection, setActiveInspection] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showInspectionDetails, setShowInspectionDetails] = useState(false);
  const [showRoomStatusDialog, setShowRoomStatusDialog] = useState(false);
  const [completedInspection, setCompletedInspection] = useState<any>(null);

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["/api/inspections"],
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/rooms"],
  });

  // Delete inspection mutation
  const deleteInspectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inspections/${id}`);
    },
    onSuccess: () => {
      invalidateQueries(["/api/inspections"]);
      toast({ title: "Inspection deleted successfully" });
      setShowDeleteDialog(false);
      setSelectedInspection(null);
    },
    onError: () => {
      toast({ title: "Failed to delete inspection", variant: "destructive" });
    },
  });

  // Archive inspection mutation
  const archiveInspectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/inspections/${id}`, { archived: true });
    },
    onSuccess: () => {
      invalidateQueries(["/api/inspections"]);
      toast({ title: "Inspection archived successfully" });
      setShowArchiveDialog(false);
      setSelectedInspection(null);
    },
    onError: () => {
      toast({ title: "Failed to archive inspection", variant: "destructive" });
    },
  });

  // Update room status mutation
  const updateRoomStatusMutation = useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string; status: string }) => {
      await apiRequest("PATCH", `/api/rooms/${roomId}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Room status updated to Clean & Inspected" });
      setShowRoomStatusDialog(false);
      setCompletedInspection(null);
    },
    onError: () => {
      toast({ title: "Failed to update room status", variant: "destructive" });
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inspections", data);
      return response.json();
    },
    onSuccess: (inspection) => {
      invalidateQueries(["/api/inspections"]);
      setActiveInspection(inspection);
      initializeChecklist(inspection.kind);
      setShowCreateModal(false);
      toast({
        title: "Inspection Started",
        description: "You can now begin the inspection checklist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Inspection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeChecklist = (kind: "room" | "process") => {
    if (kind === "room") {
      setChecklist([
        {
          id: "1",
          title: "Bed linens clean and properly arranged",
          description: "Check for stains, wrinkles, and proper hospital corners",
          completed: false,
        },
        {
          id: "2", 
          title: "Bathroom cleanliness",
          description: "Toilet, shower, sink, mirror, and floor must be spotless",
          completed: false,
        },
        {
          id: "3",
          title: "Amenities properly stocked",
          description: "Towels, toiletries, coffee, water bottles, etc.",
          completed: false,
        },
        {
          id: "4",
          title: "Room temperature and HVAC",
          description: "Proper temperature control and air circulation",
          completed: false,
        },
        {
          id: "5",
          title: "Electronics and lighting",
          description: "TV, lights, alarm clock, phone all functional",
          completed: false,
        },
        {
          id: "6",
          title: "Safety and security",
          description: "Door locks, safe, fire safety equipment",
          completed: false,
        },
      ]);
    } else {
      setChecklist([
        {
          id: "1",
          title: "Staff adherence to cleaning procedures",
          description: "Proper sequence and technique followed",
          completed: false,
        },
        {
          id: "2",
          title: "Equipment and supplies availability",
          description: "All necessary tools and cleaning supplies present",
          completed: false,
        },
        {
          id: "3",
          title: "Time management and efficiency",
          description: "Tasks completed within expected timeframe",
          completed: false,
        },
        {
          id: "4",
          title: "Safety protocol compliance",
          description: "PPE usage and safety procedures followed",
          completed: false,
        },
      ]);
    }
  };

  const handleStartInspection = () => {
    if (!selectedInspectionType || (selectedInspectionType === "room" && !selectedRoomId)) {
      toast({
        title: "Incomplete Selection",
        description: "Please select inspection type and room (if applicable).",
        variant: "destructive",
      });
      return;
    }

    createInspectionMutation.mutate({
      kind: selectedInspectionType,
      roomId: selectedInspectionType === "room" ? selectedRoomId : null,
      checklist: {},
    });
  };

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const calculateScore = () => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.completed).length;
    const passed = checklist.filter(item => item.passed === true).length;
    return Math.round((passed / checklist.length) * 100);
  };

  const handleSignOff = async () => {
    if (!activeInspection) return;
    
    const score = calculateScore();
    const passFail = score >= 80; // 80% pass threshold
    
    try {
      await apiRequest("PATCH", `/api/inspections/${activeInspection.id}`, {
        checklist: checklist,
        score,
        passFail,
        signedAt: new Date().toISOString(),
      });
      
      invalidateQueries(["/api/inspections"]);
      
      // Store completed inspection for room status dialog
      if (activeInspection.roomId && passFail) {
        setCompletedInspection(activeInspection);
        setShowRoomStatusDialog(true);
      } else {
        setActiveInspection(null);
        setChecklist([]);
      }
      
      toast({
        title: "Inspection Completed",
        description: `Inspection ${passFail ? "passed" : "failed"} with ${score}% score.`,
        variant: passFail ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Sign-off Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const { uploadURL } = await response.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  const handlePhotoUpload = async (result: any, itemId: string) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      updateChecklistItem(itemId, {
        photos: [...(checklist.find(item => item.id === itemId)?.photos || []), uploadURL]
      });
      
      toast({
        title: "Photo Uploaded",
        description: "Photo has been added to the inspection item.",
      });
    }
  };

  const canCreateInspection = user?.role && ["site_admin", "head_housekeeper"].includes(user.role);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="inspections-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inspections</h1>
        {canCreateInspection && (
          <Button onClick={() => setShowCreateModal(true)} data-testid="create-inspection-button">
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        )}
      </div>

      {/* Active Inspection */}
      {activeInspection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>
                    {activeInspection.kind === "room" ? "Room" : "Process"} Inspection
                  </span>
                  {activeInspection.roomId && (
                    <Badge variant="outline">
                      Room {rooms.find((r: any) => r.id === activeInspection.roomId)?.number}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Inspector: {user?.name} | Started: {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Progress:</div>
                <div className="text-sm font-medium">
                  {checklist.filter(item => item.completed).length}/{checklist.length} items
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.map((item) => (
              <Card key={item.id} className={`border ${item.passed === false ? "border-red-200 bg-red-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => 
                            updateChecklistItem(item.id, { completed: !!checked })
                          }
                          data-testid={`checklist-item-${item.id}`}
                        />
                        <h3 className="font-medium">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant={item.passed === true ? "default" : "outline"}
                        className={item.passed === true ? "bg-success hover:bg-success/90" : ""}
                        onClick={() => updateChecklistItem(item.id, { passed: true, completed: true })}
                        data-testid={`pass-${item.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={item.passed === false ? "destructive" : "outline"}
                        onClick={() => updateChecklistItem(item.id, { passed: false, completed: true })}
                        data-testid={`fail-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {item.notes && (
                    <div className="bg-background p-3 rounded border border-border mb-3">
                      <p className="text-sm"><strong>Note:</strong> {item.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newNotes = prompt("Add notes:", item.notes || "");
                        if (newNotes !== null) {
                          updateChecklistItem(item.id, { notes: newNotes });
                        }
                      }}
                      data-testid={`add-note-${item.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {item.notes ? "Edit Note" : "Add Note"}
                    </Button>
                    
                    <ObjectUploader
                      maxNumberOfFiles={5}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={(result) => handlePhotoUpload(result, item.id)}
                      buttonClassName="h-9 px-3"
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      {item.photos?.length ? `View Photos (${item.photos.length})` : "Add Photo"}
                    </ObjectUploader>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Inspection Actions */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Overall Score:</span>
                    <span className="font-semibold ml-2">{calculateScore()}%</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="ml-2" variant={calculateScore() >= 80 ? "default" : "destructive"}>
                      {calculateScore() >= 80 ? "Passing" : "Failing"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline">
                    Save Draft
                  </Button>
                  <Button onClick={handleSignOff} data-testid="sign-off-inspection">
                    <PenTool className="h-4 w-4 mr-2" />
                    Sign Off
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection History */}
      {!activeInspection && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            {inspections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inspections have been created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {inspections.slice(0, 10).map((inspection: any) => (
                  <div key={inspection.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {inspection.kind === "room" ? (
                          <DoorOpen className="h-4 w-4 text-primary" />
                        ) : (
                          <ClipboardList className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {inspection.kind === "room" ? "Room" : "Process"} Inspection
                          {inspection.roomId && (
                            <span className="ml-2 text-muted-foreground">
                              - Room {rooms.find((r: any) => r.id === inspection.roomId)?.number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(inspection.createdAt).toLocaleDateString()} - {new Date(inspection.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {inspection.score !== null && (
                        <Badge variant="outline">{inspection.score}%</Badge>
                      )}
                      {inspection.passFail !== null && (
                        <StatusChip status={inspection.passFail ? "completed" : "failed"} />
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`inspection-actions-${inspection.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setShowInspectionDetails(true);
                            }}
                            data-testid={`view-inspection-${inspection.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setShowArchiveDialog(true);
                            }}
                            data-testid={`archive-inspection-${inspection.id}`}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                            data-testid={`delete-inspection-${inspection.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Inspection Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Inspection</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="p-6 h-auto border-2 hover:border-primary transition-colors"
                onClick={() => setSelectedInspectionType("room")}
                data-testid="select-room-inspection"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <DoorOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Room Inspection</h3>
                    <p className="text-sm text-muted-foreground">Inspect guest room cleanliness and amenities</p>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline" 
                className="p-6 h-auto border-2 hover:border-primary transition-colors"
                onClick={() => setSelectedInspectionType("process")}
                data-testid="select-process-inspection"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Process Inspection</h3>
                    <p className="text-sm text-muted-foreground">Audit housekeeping procedures and standards</p>
                  </div>
                </div>
              </Button>
            </div>
            
            {selectedInspectionType === "room" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Room</label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger data-testid="room-select">
                    <SelectValue placeholder="Choose a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room: any) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.number} - {room.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartInspection}
                disabled={createInspectionMutation.isPending}
                data-testid="start-inspection"
              >
                {createInspectionMutation.isPending ? "Starting..." : "Start Inspection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Status Update Dialog */}
      <AlertDialog open={showRoomStatusDialog} onOpenChange={setShowRoomStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Room Status</AlertDialogTitle>
            <AlertDialogDescription>
              The inspection passed! Would you like to update the room status to "Clean & Inspected"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setActiveInspection(null);
                setChecklist([]);
                setCompletedInspection(null);
              }}
            >
              No, Keep Current Status
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (completedInspection?.roomId) {
                  updateRoomStatusMutation.mutate({
                    roomId: completedInspection.roomId,
                    status: "clean_inspected"
                  });
                  setActiveInspection(null);
                  setChecklist([]);
                }
              }}
            >
              Yes, Update to Clean & Inspected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inspection Details Dialog */}
      <Dialog open={showInspectionDetails} onOpenChange={setShowInspectionDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInspection?.kind === "room" ? "Room" : "Process"} Inspection Details
              {selectedInspection?.roomId && (
                <span className="ml-2 text-muted-foreground">
                  - Room {rooms.find((r: any) => r.id === selectedInspection.roomId)?.number}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Completed on {selectedInspection && new Date(selectedInspection.createdAt).toLocaleDateString()} at {selectedInspection && new Date(selectedInspection.createdAt).toLocaleTimeString()}
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-semibold ml-2">{selectedInspection.score || "N/A"}%</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="ml-2" variant={selectedInspection.passFail ? "default" : "destructive"}>
                      {selectedInspection.passFail ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedInspection.checklist && Array.isArray(selectedInspection.checklist) && (
                <div className="space-y-2">
                  <h3 className="font-medium">Checklist Items</h3>
                  {selectedInspection.checklist.map((item: any) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full ${item.passed ? 'bg-green-500' : item.passed === false ? 'bg-red-500' : 'bg-gray-300'}`} />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.passed ? "Passed" : item.passed === false ? "Failed" : "Not checked"}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInspection) {
                  deleteInspectionMutation.mutate(selectedInspection.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this inspection? It will be moved to the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInspection) {
                  archiveInspectionMutation.mutate(selectedInspection.id);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
