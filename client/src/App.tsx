import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Inspections from "@/pages/Inspections";
import Maintenance from "@/pages/Maintenance";
import RAMonitor from "@/pages/RAMonitor";
import Reports from "@/pages/Reports";
import PanicLog from "@/pages/PanicLog";
import Settings from "@/pages/Settings";
import FrontDesk from "@/pages/FrontDesk";
import RoomStatus from "@/pages/RoomStatus";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => (
        <Layout>
          <Dashboard />
        </Layout>
      )} />
      <Route path="/tasks" component={() => (
        <Layout>
          <Tasks />
        </Layout>
      )} />
      <Route path="/inspections" component={() => (
        <Layout>
          <Inspections />
        </Layout>
      )} />
      <Route path="/maintenance" component={() => (
        <Layout>
          <Maintenance />
        </Layout>
      )} />
      <Route path="/ra-monitor" component={() => (
        <Layout>
          <RAMonitor />
        </Layout>
      )} />
      <Route path="/reports" component={() => (
        <Layout>
          <Reports />
        </Layout>
      )} />
      <Route path="/panic-log" component={() => (
        <Layout>
          <PanicLog />
        </Layout>
      )} />
      <Route path="/settings" component={() => (
        <Layout>
          <Settings />
        </Layout>
      )} />
      <Route path="/front-desk" component={() => (
        <Layout>
          <FrontDesk />
        </Layout>
      )} />
      <Route path="/room-status" component={() => (
        <Layout>
          <RoomStatus />
        </Layout>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
