
'use client';

import DashboardClientLayout from '@/components/dashboard-client-layout';
import { ArrowLeft, Calculator, Users, Mail, PlusCircle, Trash2, Loader2, Send, KeyRound, Shield, History, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

function AccountSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>User Information</CardTitle>
                    <CardDescription>
                        Manage your personal details and role.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src="/placeholder-user.jpg" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-2 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" defaultValue="Your Name" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" defaultValue="your.email@example.com" />
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="affiliation">Affiliation</Label>
                            <Input id="affiliation" placeholder="Company, University, or Individual" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="role">Role</Label>
                             <Select defaultValue="analyst">
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                    <SelectItem value="analyst">Analyst</SelectItem>
                                    <SelectItem value="user">General User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Registration Date</Label>
                            <p className="text-sm text-muted-foreground pt-2">2023-01-15 10:30 AM</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Last Login</Label>
                            <p className="text-sm text-muted-foreground pt-2">2024-07-22 08:00 AM</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Save Changes</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield /> Security</CardTitle>
                    <CardDescription>Manage your password and authentication settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="font-medium">Change Password</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                             <div className="space-y-1">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input id="current-password" type="password" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input id="new-password" type="password" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input id="confirm-password" type="password" />
                            </div>
                        </div>
                         <Button variant="outline">Update Password</Button>
                    </div>

                    <Separator />
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <h4 className="font-medium">Two-Factor Authentication (2FA)</h4>
                            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                        </div>
                         <Switch id="2fa-switch" />
                    </div>

                     <div className="space-y-4">
                        <h4 className="font-medium">Login History</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Device</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>2024-07-22 08:00 AM</TableCell>
                                    <TableCell>192.168.1.1</TableCell>
                                    <TableCell>Chrome on macOS</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>2024-07-21 05:30 PM</TableCell>
                                    <TableCell>10.0.0.5</TableCell>
                                    <TableCell>Safari on iPhone</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> API Key Management</CardTitle>
                    <CardDescription>Manage API keys for external integrations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <Input readOnly value="sk-••••••••••••••••••••••••1234" className="font-mono"/>
                        <Button variant="outline" size="icon"><Eye className="w-4 h-4" /></Button>
                    </div>
                     <Button>Generate New Key</Button>
                </CardContent>
            </Card>
        </div>
    )
}

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
                      <AccountSettings />
                   </div>
                </main>
            </div>
        </DashboardClientLayout>
    );
}
