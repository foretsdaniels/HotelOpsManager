import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface WebSocketMessage {
  type: 'room_status_changed' | 'task_assigned' | 'task_completed' | 'inspection_completed' | 'panic_alert' | 'user_notification';
  data: any;
  timestamp: string;
  userId?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listeners = useRef<Map<string, ((message: WebSocketMessage) => void)[]>>(new Map());

  const connect = useCallback(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          role: user.role
        }));

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Call registered listeners
          const messageListeners = listeners.current.get(message.type) || [];
          messageListeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('Error in WebSocket listener:', error);
            }
          });

          // Show toast notifications for all message types
          handleNotification(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 5 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user]);

  const handleNotification = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'room_status_changed':
        if (message.data.room && message.data.updatedBy) {
          toast({
            title: "Room Status Updated",
            description: `Room ${message.data.room.number} status changed to ${message.data.room.status?.toUpperCase()} by ${message.data.updatedBy.name}`,
          });
        }
        break;

      case 'task_assigned':
        // Only show notification if task is assigned to current user
        if (message.userId === user?.id) {
          toast({
            title: "New Task Assigned",
            description: `You have been assigned: ${message.data.task?.title}`,
          });
        }
        break;

      case 'task_completed':
        if (message.data.task && message.data.completedBy) {
          toast({
            title: "Task Completed",
            description: `${message.data.task.title} completed by ${message.data.completedBy.name}`,
          });
        }
        break;

      case 'inspection_completed':
        if (message.data.inspection && message.data.inspector) {
          const passStatus = message.data.inspection.passFail ? 'PASSED' : 'FAILED';
          toast({
            title: "Inspection Completed",
            description: `${message.data.inspection.kind} inspection ${passStatus} by ${message.data.inspector.name}`,
            variant: message.data.inspection.passFail ? 'default' : 'destructive',
          });
        }
        break;

      case 'panic_alert':
        if (message.data.triggeredBy && message.data.location) {
          toast({
            title: "🚨 PANIC ALERT",
            description: `Emergency alert at ${message.data.location} triggered by ${message.data.triggeredBy.name}`,
            variant: 'destructive',
          });
        }
        break;

      case 'room_assignment_created':
        if (message.data.assignedTo && message.data.room) {
          toast({
            title: "Room Assignment Created",
            description: `${message.data.assignedTo.name} assigned to Room ${message.data.room.number}`,
          });
        }
        break;

      case 'room_assignment_deleted':
        if (message.data.assignedUser && message.data.room) {
          toast({
            title: "Room Assignment Removed",
            description: `${message.data.assignedUser.name} unassigned from Room ${message.data.room.number}`,
          });
        }
        break;

      default:
        break;
    }
  };

  // Subscribe to specific message types
  const subscribe = useCallback((messageType: string, listener: (message: WebSocketMessage) => void) => {
    if (!listeners.current.has(messageType)) {
      listeners.current.set(messageType, []);
    }
    listeners.current.get(messageType)!.push(listener);

    // Return unsubscribe function
    return () => {
      const currentListeners = listeners.current.get(messageType) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }, []);

  // Connect when user is available
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, user]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    reconnect: connect
  };
}