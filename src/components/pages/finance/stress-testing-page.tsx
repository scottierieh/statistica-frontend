'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function StressTestingPage() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Stress Testing
          </CardTitle>
          <CardDescription>
            Evaluate the resilience of financial positions under extreme market conditions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/10">
            <p className="text-muted-foreground">Market shock simulation tools coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
