'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";
import StatisticaApp from '@/components/statistica-app';
import DashboardClientLayout from "@/components/dashboard-client-layout";

export default function StatisticaPage() {
  return (
    <DashboardClientLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
          <div className="flex items-center gap-2">
             <Button variant="outline" asChild>
                  <Link href="/dashboard">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
                  </Link>
              </Button>
          </div>
           <div className="flex-1 flex justify-center">
               <Link href="/" className="flex items-center justify-center gap-2">
                  <Calculator className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-headline font-bold">Statistica</h1>
              </Link>
          </div>
          <div className="w-[180px]"/>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="max-w-8xl mx-auto">
            <StatisticaApp />
          </div>
        </main>
      </div>
    </DashboardClientLayout>
  );
}
