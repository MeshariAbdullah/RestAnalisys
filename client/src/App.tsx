import React from "react";
import { Route, Switch, useLocation, Redirect } from "wouter";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Simulator from "./pages/Simulator";
import Recipes from "./pages/Recipes";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Employees from "./pages/Employees";
import Heatmap from "./pages/Heatmap";

function isAuthenticated() {
  return !!localStorage.getItem("auth_token");
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  if (!isAuthenticated()) {
    return <Redirect to="/" />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/simulator">
        <ProtectedRoute>
          <Simulator />
        </ProtectedRoute>
      </Route>
      <Route path="/recipes">
        <ProtectedRoute>
          <Recipes />
        </ProtectedRoute>
      </Route>
      <Route path="/alerts">
        <ProtectedRoute>
          <Alerts />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/employees">
        <ProtectedRoute>
          <Employees />
        </ProtectedRoute>
      </Route>
      <Route path="/heatmap">
        <ProtectedRoute>
          <Heatmap />
        </ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}
