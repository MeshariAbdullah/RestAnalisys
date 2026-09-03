import React from "react";
import { Route, Switch, Redirect } from "wouter";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Renter
import Browse from "./pages/renter/Browse";
import ItemDetail from "./pages/renter/ItemDetail";
import LegalCommitmentPage from "./pages/renter/LegalCommitment";
import MyRentals from "./pages/renter/MyRentals";
import RentalDetail from "./pages/renter/RentalDetail";

// Owner
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import SubmitAsset from "./pages/owner/SubmitAsset";
import AssetDetail from "./pages/owner/AssetDetail";
import Payouts from "./pages/owner/Payouts";

// Inspector
import InspectorDashboard from "./pages/inspector/InspectorDashboard";
import InspectionForm from "./pages/inspector/InspectionForm";

// Ops
import OpsDashboard from "./pages/ops/OpsDashboard";
import Shipments from "./pages/ops/Shipments";
import Inventory from "./pages/ops/Inventory";
import AlertsPage from "./pages/ops/Alerts";
import RentalManagement from "./pages/ops/RentalManagement";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AssetApprovals from "./pages/admin/AssetApprovals";
import UsersPage from "./pages/admin/Users";
import DisputesPage from "./pages/admin/Disputes";
import FinancialOverview from "./pages/admin/FinancialOverview";
import SanadTracking from "./pages/admin/SanadTracking";
import AuditLog from "./pages/admin/AuditLog";

export default function App() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Renter */}
      <Route path="/browse">
        <ProtectedRoute roles={["renter"]}><Browse /></ProtectedRoute>
      </Route>
      <Route path="/browse/:id">
        {(params) => (
          <ProtectedRoute roles={["renter"]}>
            <ItemDetail id={Number(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/legal/:commitmentId">
        {(params) => (
          <ProtectedRoute roles={["renter"]}>
            <LegalCommitmentPage commitmentId={Number(params.commitmentId)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/my-rentals">
        <ProtectedRoute roles={["renter"]}><MyRentals /></ProtectedRoute>
      </Route>
      <Route path="/my-rentals/:id">
        {(params) => (
          <ProtectedRoute roles={["renter"]}>
            <RentalDetail id={Number(params.id)} />
          </ProtectedRoute>
        )}
      </Route>

      {/* Owner */}
      <Route path="/owner">
        <ProtectedRoute roles={["owner"]}><OwnerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/owner/submit">
        <ProtectedRoute roles={["owner"]}><SubmitAsset /></ProtectedRoute>
      </Route>
      <Route path="/owner/assets/:id">
        {(params) => (
          <ProtectedRoute roles={["owner"]}>
            <AssetDetail id={Number(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/owner/payouts">
        <ProtectedRoute roles={["owner"]}><Payouts /></ProtectedRoute>
      </Route>

      {/* Inspector */}
      <Route path="/inspector">
        <ProtectedRoute roles={["inspector"]}><InspectorDashboard /></ProtectedRoute>
      </Route>
      <Route path="/inspector/report/:assetId">
        {(params) => (
          <ProtectedRoute roles={["inspector"]}>
            <InspectionForm assetId={Number(params.assetId)} />
          </ProtectedRoute>
        )}
      </Route>

      {/* Operations */}
      <Route path="/ops">
        <ProtectedRoute roles={["operations"]}><OpsDashboard /></ProtectedRoute>
      </Route>
      <Route path="/ops/shipments">
        <ProtectedRoute roles={["operations"]}><Shipments /></ProtectedRoute>
      </Route>
      <Route path="/ops/inventory">
        <ProtectedRoute roles={["operations"]}><Inventory /></ProtectedRoute>
      </Route>
      <Route path="/ops/alerts">
        <ProtectedRoute roles={["operations"]}><AlertsPage /></ProtectedRoute>
      </Route>
      <Route path="/ops/rentals">
        <ProtectedRoute roles={["operations"]}><RentalManagement /></ProtectedRoute>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <ProtectedRoute roles={["admin", "super_admin"]}><AdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/admin/approvals">
        <ProtectedRoute roles={["admin", "super_admin"]}><AssetApprovals /></ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute roles={["admin", "super_admin"]}><UsersPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/disputes">
        <ProtectedRoute roles={["admin", "super_admin"]}><DisputesPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/finance">
        <ProtectedRoute roles={["admin", "super_admin"]}><FinancialOverview /></ProtectedRoute>
      </Route>
      <Route path="/admin/sanad">
        <ProtectedRoute roles={["admin", "super_admin"]}><SanadTracking /></ProtectedRoute>
      </Route>
      <Route path="/admin/audit">
        <ProtectedRoute roles={["admin", "super_admin"]}><AuditLog /></ProtectedRoute>
      </Route>
      <Route path="/admin/rentals">
        <ProtectedRoute roles={["admin", "super_admin"]}><RentalManagement /></ProtectedRoute>
      </Route>

      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
