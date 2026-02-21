
'use client';

import React, { Suspense } from 'react';
import DashboardClientLayout from "@/components/dashboard-client-layout";
import IntegrationsApp from "@/components/integrations-app";
import { Loader2 } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <DashboardClientLayout>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <IntegrationsApp />
      </Suspense>
    </DashboardClientLayout>
  );
}
