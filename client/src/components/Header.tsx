import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Menu, Hotel, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [triggeringPanic, setTriggeringPanic] = useState(false);

  const canTriggerPanic = user?.role && ["site_admin", "head_housekeeper", "room_attendant", "maintenance", "front_desk_manager"].includes(user.role);

  const handlePanicTrigger = async () => {
    try {
      setTriggeringPanic(true);
      await apiRequest("POST", "/api/panic/trigger", {});
      
      toast({
        title: "Panic Alert Triggered",
        description: "Emergency alert has been sent to all administrators.",
        variant: "destructive",
      });
      
      setShowPanicModal(false);
    } catch (error: any) {
      toast({
        title: "Failed to Trigger Alert",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTriggeringPanic(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm relative z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target lg:hidden"
                onClick={onMenuToggle}
                data-testid="menu-toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Hotel className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Hotel Ops</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canTriggerPanic && (
              <Button
                variant="destructive"
                size="sm"
                className="touch-target"
                onClick={() => setShowPanicModal(true)}
                data-testid="panic-button"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                PANIC
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-secondary-foreground text-sm font-medium">
                  {user ? getUserInitials(user.name) : "??"}
                </span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium" data-testid="user-name">
                  {user?.name}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="user-role">
                  {user?.role?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Panic Alert Modal */}
      <Dialog open={showPanicModal} onOpenChange={setShowPanicModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Panic Alert</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will notify all administrators immediately
            </p>
            
            <p className="text-foreground">Are you sure you want to trigger a panic alert? This action will:</p>
            
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Send immediate notifications to all admins</li>
              <li>Log your location and timestamp</li>
              <li>Require follow-up documentation</li>
            </ul>
            
            <div className="flex space-x-3 pt-4">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handlePanicTrigger}
                disabled={triggeringPanic}
                data-testid="confirm-panic"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {triggeringPanic ? "Triggering..." : "Trigger Alert"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPanicModal(false)}
                data-testid="cancel-panic"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
