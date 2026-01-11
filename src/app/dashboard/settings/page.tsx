
'use client';

import SettingsPage from '@/components/pages/settings-page';
import DashboardClientLayout from '@/components/dashboard-client-layout';
import { ArrowLeft, Calculator, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Settings() {
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
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">Settings</h1>
                        </Link>
                    </div>
                    <div className="w-[180px]" />
                </header>
                <main className="flex-1 p-4 md:p-8 lg:p-12">
                   <div className="max-w-4xl mx-auto">
                      <Tabs defaultValue="account">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="account">Account</TabsTrigger>
                          <TabsTrigger value="team">Team</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account">
                          <SettingsPage />
                        </TabsContent>
                        <TabsContent value="team">
                          <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Users />Team Management</CardTitle>
                                <CardDescription>
                                    Invite team members and manage their roles. This feature is coming soon!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center py-12">
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <Users className="w-8 h-8 text-primary" />
                                    </div>
                                </div>
                                <p className="text-muted-foreground">Team management features will be available here.</p>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                   </div>
                </main>
            </div>
        </DashboardClientLayout>
    );
}
