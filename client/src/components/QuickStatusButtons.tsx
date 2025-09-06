import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  CheckCircle, 
  Home, 
  Ban, 
  Clock,
  Wrench,
  Shield,
  Star,
  Zap
} from "lucide-react";
import confetti from 'canvas-confetti';

interface QuickStatusButtonsProps {
  currentStatus: string;
  onStatusChange: (status: string) => Promise<void>;
  size?: "sm" | "default" | "lg";
  showLabels?: boolean;
}

const statusConfig = {
  ready: {
    label: "Ready",
    icon: Home,
    color: "bg-green-500 hover:bg-green-600",
    emoji: "✨",
    confetti: true,
    animation: "bounce"
  },
  dirty: {
    label: "Dirty",
    icon: Clock,
    color: "bg-yellow-500 hover:bg-yellow-600",
    emoji: "🧹",
    confetti: false,
    animation: "shake"
  },
  clean_inspected: {
    label: "Clean & Inspected",
    icon: CheckCircle,
    color: "bg-blue-500 hover:bg-blue-600",
    emoji: "✅",
    confetti: true,
    animation: "bounce"
  },
  out_of_order: {
    label: "Out of Order",
    icon: Ban,
    color: "bg-red-500 hover:bg-red-600",
    emoji: "🚫",
    confetti: false,
    animation: "shake"
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    color: "bg-orange-500 hover:bg-orange-600",
    emoji: "🔧",
    confetti: false,
    animation: "shake"
  }
};

export function QuickStatusButtons({
  currentStatus,
  onStatusChange,
  size = "default",
  showLabels = true
}: QuickStatusButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const handleStatusChange = async (status: string) => {
    if (status === currentStatus || isUpdating) return;
    
    setIsUpdating(true);
    
    // Trigger haptic-like visual feedback
    const button = document.getElementById(`status-btn-${status}`);
    if (button) {
      button.classList.add('scale-95');
      setTimeout(() => button.classList.remove('scale-95'), 100);
    }

    try {
      await onStatusChange(status);
      setSuccessStatus(status);
      
      // Trigger confetti for celebratory statuses
      const config = statusConfig[status as keyof typeof statusConfig];
      if (config?.confetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
        });
      }
      
      // Clear success animation after delay
      setTimeout(() => setSuccessStatus(null), 2000);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const animations = {
    bounce: {
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    },
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(statusConfig).map(([status, config]) => {
        const Icon = config.icon;
        const isActive = currentStatus === status;
        const isSuccess = successStatus === status;
        
        return (
          <motion.div
            key={status}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isSuccess ? animations[config.animation as keyof typeof animations] : {}}
          >
            <Button
              id={`status-btn-${status}`}
              variant={isActive ? "default" : "outline"}
              size={size}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating}
              className={`
                relative overflow-hidden transition-all duration-200
                ${isActive ? config.color : ''}
                ${!isActive && 'hover:border-2'}
                group
              `}
              data-testid={`quick-status-${status}`}
            >
              <AnimatePresence>
                {isSuccess && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 2, opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{
                      background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                  />
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-2 relative z-10">
                <motion.div
                  animate={isActive ? { rotate: 360 } : {}}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <Icon className={`h-4 w-4 ${isActive ? '' : 'group-hover:hidden'}`} />
                  <span className={`absolute inset-0 text-lg ${isActive ? 'hidden' : 'hidden group-hover:block'}`}>
                    {config.emoji}
                  </span>
                </motion.div>
                
                {showLabels && (
                  <span className="font-medium">
                    {config.label}
                  </span>
                )}
                
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-1"
                  >
                    <Sparkles className="h-3 w-3 text-yellow-300" />
                  </motion.div>
                )}
              </div>
              
              {/* Ripple effect on click */}
              <AnimatePresence>
                {isSuccess && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 rounded-full bg-white/50"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

export function QuickStatusCard({
  roomNumber,
  currentStatus,
  onStatusChange,
  roomType,
  floor
}: {
  roomNumber: string;
  currentStatus: string;
  onStatusChange: (status: string) => Promise<void>;
  roomType?: string;
  floor?: number;
}) {
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleStatusChange = async (status: string) => {
    await onStatusChange(status);
    setShowSuccess(true);
    
    // Trigger a fun success animation
    const card = document.getElementById(`room-card-${roomNumber}`);
    if (card) {
      card.classList.add('animate-pulse');
      setTimeout(() => card.classList.remove('animate-pulse'), 1000);
    }
    
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <motion.div
      id={`room-card-${roomNumber}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={showSuccess ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-primary"
          >
            {roomNumber}
          </motion.div>
          {roomType && (
            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {roomType}
            </span>
          )}
          {floor && (
            <span className="text-sm text-muted-foreground">
              Floor {floor}
            </span>
          )}
        </div>
        
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="flex items-center gap-1 text-green-500"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Updated!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          Current: <span className="font-medium text-foreground">
            {statusConfig[currentStatus as keyof typeof statusConfig]?.label || currentStatus}
          </span>
        </div>
        
        <QuickStatusButtons
          currentStatus={currentStatus}
          onStatusChange={handleStatusChange}
          size="sm"
          showLabels={false}
        />
      </div>
      
      {/* Fun floating particles animation */}
      <AnimatePresence>
        {showSuccess && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 0
                }}
                animate={{ 
                  x: Math.random() * 200 - 100,
                  y: -100 - Math.random() * 100,
                  opacity: 0,
                  scale: 1
                }}
                transition={{ 
                  duration: 1 + Math.random(),
                  ease: "easeOut"
                }}
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                }}
              >
                <Star className="h-4 w-4 text-yellow-400" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}