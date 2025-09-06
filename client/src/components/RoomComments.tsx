import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  MessageSquare, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

interface RoomCommentsProps {
  roomId: string;
  roomNumber: string;
}

export default function RoomComments({ roomId, roomNumber }: RoomCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({
    comment: "",
    priority: "low",
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/room-comments", roomId],
    queryFn: () => apiRequest("GET", `/api/room-comments?roomId=${roomId}`),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create lookup map for users
  const userMap = users.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {});

  const createCommentMutation = useMutation({
    mutationFn: (commentData: any) => 
      apiRequest("POST", "/api/room-comments", { ...commentData, roomId }),
    onSuccess: () => {
      toast({ title: "Comment added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/room-comments", roomId] });
      setNewComment({ comment: "", priority: "low" });
      setShowAddComment(false);
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: ({ commentId, isResolved }: { commentId: string; isResolved: boolean }) =>
      apiRequest("PATCH", `/api/room-comments/${commentId}`, { isResolved }),
    onSuccess: () => {
      toast({ title: "Comment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/room-comments", roomId] });
    },
    onError: () => {
      toast({ title: "Failed to update comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiRequest("DELETE", `/api/room-comments/${commentId}`),
    onSuccess: () => {
      toast({ title: "Comment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/room-comments", roomId] });
    },
    onError: () => {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <AlertTriangle className="h-3 w-3" />;
      case "high": return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const canDeleteComment = (comment: any) => {
    // Users can delete their own comments, or admins/head housekeepers can delete any
    return comment.userId === user?.id || 
           user?.role === "site_admin" || 
           user?.role === "head_housekeeper";
  };

  const unresolvedComments = comments.filter((comment: any) => !comment.isResolved);
  const resolvedComments = comments.filter((comment: any) => comment.isResolved);

  return (
    <Card className="w-full" data-testid={`room-comments-${roomNumber}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span>Room {roomNumber} Comments</span>
            {unresolvedComments.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedComments.length} open
              </Badge>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowAddComment(!showAddComment)}
            data-testid="add-comment-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showAddComment && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <Textarea
                placeholder="Enter your comment about this room..."
                value={newComment.comment}
                onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                className="min-h-20"
                data-testid="comment-input"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  <Select
                    value={newComment.priority}
                    onValueChange={(value) => setNewComment({ ...newComment, priority: value })}
                  >
                    <SelectTrigger className="w-32" data-testid="priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddComment(false);
                      setNewComment({ comment: "", priority: "low" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createCommentMutation.mutate(newComment)}
                    disabled={!newComment.comment.trim() || createCommentMutation.isPending}
                    data-testid="save-comment-button"
                  >
                    {createCommentMutation.isPending ? "Saving..." : "Save Comment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments for this room yet.</p>
            <p className="text-sm">Add the first comment to share information with your team.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unresolved Comments */}
            {unresolvedComments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Open Items ({unresolvedComments.length})
                </h4>
                {unresolvedComments.map((comment: any) => {
                  const commentUser = userMap[comment.userId];
                  return (
                    <Card key={comment.id} className="border-l-4 border-l-amber-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {commentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {commentUser?.name || 'Unknown User'}
                                </span>
                                <Badge variant={getPriorityColor(comment.priority)} className="flex items-center gap-1">
                                  {getPriorityIcon(comment.priority)}
                                  {comment.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm">{comment.comment}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resolveCommentMutation.mutate({ 
                                    commentId: comment.id, 
                                    isResolved: true 
                                  })}
                                  disabled={resolveCommentMutation.isPending}
                                  data-testid={`resolve-comment-${comment.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Mark Resolved
                                </Button>
                                {canDeleteComment(comment) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                                    disabled={deleteCommentMutation.isPending}
                                    data-testid={`delete-comment-${comment.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Resolved Comments */}
            {resolvedComments.length > 0 && unresolvedComments.length > 0 && (
              <Separator className="my-4" />
            )}
            
            {resolvedComments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resolved ({resolvedComments.length})
                </h4>
                {resolvedComments.map((comment: any) => {
                  const commentUser = userMap[comment.userId];
                  return (
                    <Card key={comment.id} className="border-l-4 border-l-green-500 opacity-75">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {commentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {commentUser?.name || 'Unknown User'}
                                </span>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  Resolved
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm">{comment.comment}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resolveCommentMutation.mutate({ 
                                    commentId: comment.id, 
                                    isResolved: false 
                                  })}
                                  disabled={resolveCommentMutation.isPending}
                                  data-testid={`unresolve-comment-${comment.id}`}
                                >
                                  Reopen
                                </Button>
                                {canDeleteComment(comment) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                                    disabled={deleteCommentMutation.isPending}
                                    data-testid={`delete-resolved-comment-${comment.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}