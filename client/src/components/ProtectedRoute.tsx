import React from "react";
import { Redirect } from "wouter";
import Layout from "./Layout";
import { canAccess, getCurrentUser, isAuthenticated } from "@/lib/auth";
import type { Role } from "@/lib/api";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  const user = getCurrentUser();
  if (!canAccess(roles, user)) {
    return <Redirect to="/login" />;
  }
  return <Layout>{children}</Layout>;
}
