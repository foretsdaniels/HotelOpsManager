import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusChip from "@/components/StatusChip";
import { apiRequest, invalidateQueries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, 
  Search, 
  Package, 
  MapPin, 
  Calendar, 
  User, 
  Archive,
  CheckCircle,
  Trash2
} from "lucide-react";

interface LostFoundItem {
  id: string;
  description: string;
  locationFound: string;
  storageArea?: string;
  status: "logged" | "stored" | "returned" | "expired_cleared";
  expireAt?: string;
  foundById: string;
  createdAt: string;
  updatedAt: string;
}

export default function LostFound() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newItem, setNewItem] = useState({
    description: "",
    locationFound: "",
    storageArea: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/lf", { status: statusFilter === "all" ? undefined : statusFilter }],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/lf/report", {
        ...data,
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      });
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/lf"]);
      setShowReportModal(false);
      setNewItem({ description: "", locationFound: "", storageArea: "" });
      toast({
        title: "Item Reported",
        description: "Lost item has been logged successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Report Item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      let endpoint = `/api/lf/${id}`;
      
      if (updates.status === "stored") {
        endpoint = `/api/lf/${id}/storage`;
      } else if (updates.status === "returned") {
        endpoint = `/api/lf/${id}/return`;
        updates = {}; // Return endpoint doesn't need body
      }
      
      const method = updates.status === "returned" ? "POST" : "PATCH";
      const response = await apiRequest(method, endpoint, updates);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/lf"]);
      setSelectedItem(null);
      toast({
        title: "Item Updated",
        description: "Item status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkClearMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/lf/bulk-clear-expired", {});
      return response.json();
    },
    onSuccess: (data) => {
      invalidateQueries(["/api/lf"]);
      toast({
        title: "Expired Items Cleared",
        description: `${data.clearedCount} expired items have been cleared.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReportItem = () => {
    if (!newItem.description || !newItem.locationFound) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    createItemMutation.mutate(newItem);
  };

  const handleStoreItem = (item: LostFoundItem, storageArea: string) => {
    updateItemMutation.mutate({
      id: item.id,
      updates: {
        status: "stored",
        storageArea,
      },
    });
  };

  const handleReturnItem = (item: LostFoundItem) => {
    updateItemMutation.mutate({
      id: item.id,
      updates: {
        status: "returned",
      },
    });
  };

  // Filter items based on search query
  const filteredItems = items.filter((item: LostFoundItem) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      item.description.toLowerCase().includes(searchLower) ||
      item.locationFound.toLowerCase().includes(searchLower) ||
      item.storageArea?.toLowerCase().includes(searchLower)
    );
  });

  // Group items by status
  const itemsByStatus = {
    logged: filteredItems.filter((item: LostFoundItem) => item.status === "logged"),
    stored: filteredItems.filter((item: LostFoundItem) => item.status === "stored"),
    returned: filteredItems.filter((item: LostFoundItem) => item.status === "returned"),
    expired_cleared: filteredItems.filter((item: LostFoundItem) => item.status === "expired_cleared"),
  };

  const expiredItems = filteredItems.filter((item: LostFoundItem) => 
    item.expireAt && 
    new Date(item.expireAt) < new Date() && 
    item.status !== "expired_cleared"
  );

  const getItemAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    return `${diffInDays} days ago`;
  };

  const getDaysUntilExpiry = (expireAt?: string) => {
    if (!expireAt) return null;
    
    const expire = new Date(expireAt);
    const now = new Date();
    const diffInDays = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffInDays;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" data-testid="lost-found-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lost & Found</h1>
        <div className="flex space-x-2">
          {expiredItems.length > 0 && (
            <Button
              variant="outline"
              onClick={() => bulkClearMutation.mutate()}
              disabled={bulkClearMutation.isPending}
              data-testid="bulk-clear-expired"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Expired ({expiredItems.length})
            </Button>
          )}
          <Button onClick={() => setShowReportModal(true)} data-testid="report-lost-item">
            <Plus className="h-4 w-4 mr-2" />
            Report Item
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by description or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-items"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="logged">Logged</SelectItem>
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="expired_cleared">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{itemsByStatus.logged.length}</div>
            <div className="text-sm text-muted-foreground">Logged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{itemsByStatus.stored.length}</div>
            <div className="text-sm text-muted-foreground">Stored</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{itemsByStatus.returned.length}</div>
            <div className="text-sm text-muted-foreground">Returned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{expiredItems.length}</div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </CardContent>
        </Card>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" 
                    ? "No items match your current filters." 
                    : "No lost & found items reported yet."}
                </div>
                <Button className="mt-4" onClick={() => setShowReportModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Report First Item
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredItems.map((item: LostFoundItem) => {
            const finder = users.find((u: any) => u.id === item.foundById);
            const daysUntilExpiry = getDaysUntilExpiry(item.expireAt);
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            
            return (
              <Card 
                key={item.id} 
                className={`hover:shadow-md transition-shadow ${
                  isExpired ? "border-red-200 bg-red-50" : 
                  isExpiringSoon ? "border-yellow-200 bg-yellow-50" : ""
                }`}
                data-testid={`item-card-${item.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-1" data-testid="item-description">
                        {item.description}
                      </h3>
                      <StatusChip status={item.status} />
                    </div>
                    
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center ml-2">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span data-testid="location-found">Found: {item.locationFound}</span>
                    </div>
                    
                    {item.storageArea && (
                      <div className="flex items-center space-x-1">
                        <Archive className="h-3 w-3" />
                        <span data-testid="storage-area">Storage: {item.storageArea}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>Found by: {finder?.name || "Unknown"}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{getItemAge(item.createdAt)}</span>
                    </div>
                    
                    {daysUntilExpiry !== null && (
                      <div className={`flex items-center space-x-1 ${
                        isExpired ? "text-red-600" : 
                        isExpiringSoon ? "text-yellow-600" : ""
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {isExpired 
                            ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                            : `Expires in ${daysUntilExpiry} days`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-1">
                    {item.status === "logged" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          const storage = prompt("Enter storage area:");
                          if (storage) {
                            handleStoreItem(item, storage);
                          }
                        }}
                        disabled={updateItemMutation.isPending}
                        data-testid={`store-item-${item.id}`}
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Store
                      </Button>
                    )}
                    
                    {item.status === "stored" && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-success hover:bg-success/90"
                        onClick={() => handleReturnItem(item)}
                        disabled={updateItemMutation.isPending}
                        data-testid={`return-item-${item.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Return
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setSelectedItem(item)}
                      data-testid={`view-item-${item.id}`}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Report Item Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Lost Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Item Description *</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the item (e.g., black leather wallet, iPhone 12, etc.)"
                rows={3}
                data-testid="item-description-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location Found *</Label>
              <Input
                id="location"
                value={newItem.locationFound}
                onChange={(e) => setNewItem(prev => ({ ...prev, locationFound: e.target.value }))}
                placeholder="Where was the item found? (e.g., Room 205, Lobby, Restaurant)"
                data-testid="location-found-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage">Storage Area (Optional)</Label>
              <Input
                id="storage"
                value={newItem.storageArea}
                onChange={(e) => setNewItem(prev => ({ ...prev, storageArea: e.target.value }))}
                placeholder="If already stored, specify location"
                data-testid="storage-area-input"
              />
            </div>
            
            <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Items will expire after 30 days if not returned</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReportItem}
                disabled={createItemMutation.isPending}
                data-testid="confirm-report-item"
              >
                {createItemMutation.isPending ? "Reporting..." : "Report Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Details Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Location Found</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedItem.locationFound}</p>
              </div>
              
              {selectedItem.storageArea && (
                <div>
                  <Label className="text-sm font-medium">Storage Area</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedItem.storageArea}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <StatusChip status={selectedItem.status} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Reported</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                {selectedItem.expireAt && (
                  <div>
                    <Label className="text-sm font-medium">Expires</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedItem.expireAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
