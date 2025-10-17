
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Shield, Bell, CreditCard, Sliders, LogOut, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const { user, login, logout } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleProfileUpdate = () => {
    if (user) {
      const updatedUser = { ...user, name, email };
      login(updatedUser);
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been successfully saved.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-8">
            <TabsList className="flex flex-row md:flex-col md:w-1/4 h-auto bg-transparent p-0">
                <TabsTrigger value="profile" className="w-full justify-start gap-2"><User className="w-4 h-4"/> Profile</TabsTrigger>
                <TabsTrigger value="security" className="w-full justify-start gap-2"><Shield className="w-4 h-4"/> Security</TabsTrigger>
                <TabsTrigger value="notifications" className="w-full justify-start gap-2"><Bell className="w-4 h-4"/> Notifications</TabsTrigger>
                <TabsTrigger value="billing" className="w-full justify-start gap-2"><CreditCard className="w-4 h-4"/> Billing</TabsTrigger>
                <TabsTrigger value="system" className="w-full justify-start gap-2"><Sliders className="w-4 h-4"/> System</TabsTrigger>
                <TabsTrigger value="account" className="w-full justify-start gap-2 text-destructive"><LogOut className="w-4 h-4"/> Account</TabsTrigger>
            </TabsList>
            <div className="flex-1">
                 <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={user?.email === 'demo@skarii.com' ? '/avatars/01.png' : ''} />
                                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button variant="outline">Change Photo</Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleProfileUpdate}>Save Changes</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                 <TabsContent value="security">
                     <Card>
                        <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Manage your account security settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input id="current-password" type="password" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input id="new-password" type="password" />
                            </div>
                             <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Two-Factor Authentication (2FA)</Label>
                                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                                </div>
                                <Button variant="outline" disabled>Enable</Button>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button>Change Password</Button>
                        </CardFooter>
                    </Card>
                 </TabsContent>
                 <TabsContent value="notifications">
                     <Card>
                        <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Manage how you receive notifications from us.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive updates about new features and important announcements.</p>
                            </div>
                            <Switch id="email-notifications" defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                            <Label htmlFor="survey-alerts">Survey Completion Alerts</Label>
                            <p className="text-sm text-muted-foreground">Get an email when a respondent completes one of your surveys.</p>
                            </div>
                            <Switch id="survey-alerts" />
                        </div>
                        </CardContent>
                        <CardFooter>
                            <Button>Save Notification Settings</Button>
                        </CardFooter>
                    </Card>
                 </TabsContent>
                 <TabsContent value="billing">
                    <Card>
                        <CardHeader><CardTitle>Billing & Plan</CardTitle><CardDescription>Manage your subscription and view billing history.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <p>You are currently on the <strong>Free Plan</strong>.</p>
                             <Button>Upgrade to Pro</Button>
                             <Separator/>
                             <h4 className="font-semibold">Billing History</h4>
                             <p className="text-sm text-muted-foreground">No billing history found.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="system">
                     <Card>
                        <CardHeader><CardTitle>System Settings</CardTitle><CardDescription>Customize your application experience.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Language</Label>
                                    <p className="text-sm text-muted-foreground">Choose your preferred language.</p>
                                </div>
                                <Button variant="outline" disabled>English</Button>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Theme</Label>
                                    <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
                                </div>
                                <Button variant="outline" disabled>System</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="account">
                     <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>Manage critical account actions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Log Out</Label>
                                    <p className="text-sm text-muted-foreground">End your current session on this device.</p>
                                </div>
                                <Button variant="outline" onClick={logout}>Log Out</Button>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-destructive">Delete Account</Label>
                                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                                </div>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Delete Account</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove your data from our servers.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Continue</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                 </TabsContent>
            </div>
        </Tabs>
    </div>
  );
}
