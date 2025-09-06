import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  canReceivePanicAlerts: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Checking auth, token exists:", !!token);
      if (!token) {
        console.log("No token found, user not authenticated");
        setIsLoading(false);
        return;
      }

      console.log("Making request to /api/auth/me");
      const response = await apiRequest("GET", "/api/auth/me");
      const userData = await response.json();
      console.log("Auth check successful, user data:", userData);
      setUser(userData);
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Starting login attempt for:", email);
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });
      console.log("Login response status:", response.status);
      
      const { token, user: userData } = await response.json();
      console.log("Login successful, got token and user data:", { token: token.substring(0, 20) + "...", user: userData });
      
      localStorage.setItem("token", token);
      setUser(userData);
      console.log("Navigating to dashboard...");
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  return { user, isLoading };
}
