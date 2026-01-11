
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import DashboardClientLayout from "@/components/dashboard-client-layout";

export default function TeamSettingsPage() {
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
                    <div className="flex items-center justify-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-headline font-bold">Team Settings</h1>
                    </div>
                </div>
                <div className="w-[180px]" />
            </header>
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                 <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Management</CardTitle>
                            <CardDescription>
                                This feature is under construction. Soon you will be able to invite team members and manage their roles here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center py-12">
                             <div className="flex justify-center mb-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Users className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <p className="text-muted-foreground">Team features are coming soon!</p>
                        </CardContent>
                    </Card>
                 </div>
            </main>
        </div>
    </DashboardClientLayout>
  );
}
