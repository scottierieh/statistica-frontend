'use client';
import DashboardClientLayout from "@/components/dashboard-client-layout";
import FinanceAnalyticsApp from "@/components/finance-analytics-app";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";

export default function FinanceAnalyticsPage() {
    return (
        <DashboardClientLayout>
            <div className="flex flex-col min-h-screen">
                <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <h1 className="text-xl font-headline font-bold">Finance Analytics</h1>
                    </div>
                    <div className="w-48 flex justify-end">
                      <UserNav />
                    </div>
                </header>
                <main className="flex-1 p-6 bg-slate-50/50">
                  <div className="max-w-6xl mx-auto">
                    <FinanceAnalyticsApp />
                  </div>
                </main>
            </div>
        </DashboardClientLayout>
    )
}
