import React from "react";
import { Redirect, useLocation } from "wouter";
import Layout from "./Layout";
import { canAccess, getCurrentUser, homeForRole, isAuthenticated } from "@/lib/auth";
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
    if (user) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">Access Denied</h2>
              <p className="text-sm text-neutral-500 mb-6">
                Your role ({user.role.replace("_", " ")}) does not have permission to access this page.
              </p>
              <a
                href={homeForRole(user.role)}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-neutral-950 text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </Layout>
      );
    }
    return <Redirect to="/login" />;
  }
  return <Layout>{children}</Layout>;
}
