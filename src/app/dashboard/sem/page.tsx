'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Network } from "lucide-react";
import Link from "next/link";
import SemPage from '@/components/pages/sem-page';
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { UserNav } from "@/components/user-nav";

export default function SemDashboardPage() {
  return (
    <DashboardClientLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
          <div className="flex items-center gap-2">
             <Button variant="outline" asChild>
                  <Link href="/dashboard">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Workspace
                  </Link>
              </Button>
          </div>
           <div className="flex-1 flex justify-center">
               <Link href="/" className="flex items-center justify-center gap-2">
                  <Network className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-headline font-bold">Structural Equation Modeling</h1>
              </Link>
          </div>
          <div className="w-[180px] flex justify-end">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <SemPage data={[]} allHeaders={[]} numericHeaders={[]} categoricalHeaders={[]} onLoadExample={() => {}} />
          </div>
        </main>
      </div>
    </DashboardClientLayout>
  );
}
