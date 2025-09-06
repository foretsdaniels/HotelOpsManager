import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface WebSocketMessage {
  type: 'room_status_changed' | 'task_assigned' | 'task_completed' | 'inspection_completed' | 'panic_alert' | 'user_notification' | 'room_assignment_created' | 'room_assignment_deleted';
  data: any;
  timestamp: string;
  userId?: string; // For user-specific notifications
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, { userId?: string; role?: string }> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('WebSocket client connected');
      
      // Store client connection
      this.clients.set(ws, {});

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          // Handle authentication message
          if (data.type === 'auth' && data.userId && data.role) {
            this.clients.set(ws, { userId: data.userId, role: data.role });
            console.log(`WebSocket client authenticated: ${data.userId} (${data.role})`);
            
            // Send confirmation
            this.sendToClient(ws, {
              type: 'user_notification',
              data: { message: 'WebSocket connected', status: 'connected' },
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('WebSocket server initialized on /ws');
  }

  // Send message to a specific client
  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all connected clients
  broadcast(message: WebSocketMessage) {
    if (!this.wss) return;

    const payload = JSON.stringify(message);
    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  // Broadcast to clients with specific roles
  broadcastToRoles(message: WebSocketMessage, roles: string[]) {
    if (!this.wss) return;

    const payload = JSON.stringify(message);
    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && clientInfo.role && roles.includes(clientInfo.role)) {
        ws.send(payload);
      }
    });
  }

  // Send to specific user
  sendToUser(userId: string, message: WebSocketMessage) {
    if (!this.wss) return;

    const payload = JSON.stringify(message);
    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && clientInfo.userId === userId) {
        ws.send(payload);
      }
    });
  }

  // Broadcast room status change
  broadcastRoomStatusChange(room: any, previousStatus: string, updatedBy: any) {
    this.broadcast({
      type: 'room_status_changed',
      data: {
        room,
        previousStatus,
        updatedBy: {
          name: updatedBy.name,
          role: updatedBy.role
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast task assignment
  broadcastTaskAssigned(task: any, assignee: any, room?: any) {
    this.sendToUser(task.assigneeId, {
      type: 'task_assigned',
      data: {
        task,
        assignee: {
          name: assignee.name,
          role: assignee.role
        },
        room
      },
      timestamp: new Date().toISOString(),
      userId: task.assigneeId
    });

    // Also notify supervisors
    this.broadcastToRoles({
      type: 'task_assigned',
      data: {
        task,
        assignee: {
          name: assignee.name,
          role: assignee.role
        },
        room
      },
      timestamp: new Date().toISOString()
    }, ['site_admin', 'head_housekeeper']);
  }

  // Broadcast task completion
  broadcastTaskCompleted(task: any, completedBy: any, room?: any) {
    this.broadcastToRoles({
      type: 'task_completed',
      data: {
        task,
        completedBy: {
          name: completedBy.name,
          role: completedBy.role
        },
        room
      },
      timestamp: new Date().toISOString()
    }, ['site_admin', 'head_housekeeper', 'front_desk_manager']);
  }

  // Broadcast inspection completion
  broadcastInspectionCompleted(inspection: any, inspector: any, room?: any) {
    this.broadcastToRoles({
      type: 'inspection_completed',
      data: {
        inspection,
        inspector: {
          name: inspector.name,
          role: inspector.role
        },
        room
      },
      timestamp: new Date().toISOString()
    }, ['site_admin', 'head_housekeeper']);
  }

  // Broadcast panic alert
  broadcastPanicAlert(triggeredBy: any, location: string) {
    this.broadcast({
      type: 'panic_alert',
      data: {
        triggeredBy: {
          name: triggeredBy.name,
          role: triggeredBy.role
        },
        location,
        alertTime: new Date().toLocaleString()
      },
      timestamp: new Date().toISOString()
    });
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.userId).length
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();