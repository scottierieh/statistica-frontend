'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import DashboardClientLayout from "@/components/dashboard-client-layout";

export default function DerivativesPage() {
  return (
    <DashboardClientLayout>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="absolute top-4 left-4">
                <Button asChild variant="outline">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools</Link>
                </Button>
            </div>
          <Card className="w-full max-w-2xl text-center shadow-lg">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="font-headline text-3xl">Derivatives Analysis</CardTitle>
              <CardDescription className="text-base mt-2">
                This section is under construction.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Tools for options pricing, greeks, and other derivatives analytics are coming soon!</p>
            </CardContent>
          </Card>
        </div>
    </DashboardClientLayout>
  );
}
