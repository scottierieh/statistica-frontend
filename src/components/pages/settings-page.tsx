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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, Shield, Bell, CreditCard, Sliders, LogOut, Trash2, 
  Camera, Mail, Lock, Smartphone, Globe, Moon, Sun, Monitor,
  CheckCircle2, AlertCircle, Zap, Download, Upload
} from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { user, login, logout } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');

  const handleProfileUpdate = () => {
    if (user) {
      const updatedUser = { ...user, name, email };
      login(updatedUser);
      toast({
        title: '✓ Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    }
  };

  const handlePasswordChange = () => {
    toast({
      title: '✓ Password Updated',
      description: 'Your password has been changed successfully.',
    });
  };

  const handleNotificationSave = () => {
    toast({
      title: '✓ Preferences Saved',
      description: 'Your notification settings have been updated.',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col lg:flex-row gap-8">
        <TabsList className="flex flex-row lg:flex-col lg:w-64 h-auto bg-card border p-2 justify-start">
          <TabsTrigger value="profile" className="w-full justify-start gap-3 data-[state=active]:bg-primary/10">
            <User className="w-4 h-4"/> 
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full justify-start gap-3 data-[state=active]:bg-primary/10">
            <Shield className="w-4 h-4"/> 
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="w-full justify-start gap-3 data-[state=active]:bg-primary/10">
            <Bell className="w-4 h-4"/> 
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="w-full justify-start gap-3 data-[state=active]:bg-primary/10">
            <CreditCard className="w-4 h-4"/> 
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="w-full justify-start gap-3 data-[state=active]:bg-primary/10">
            <Sliders className="w-4 h-4"/> 
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <Separator className="my-2" />
          <TabsTrigger value="account" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 data-[state=active]:bg-destructive/10">
            <LogOut className="w-4 h-4"/> 
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 space-y-6">
          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.email === 'demo@skarii.com' ? '/avatars/01.png' : ''} />
                      <AvatarFallback className="bg-primary/10 text-lg">{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-sm"
                    >
                      <Camera className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">{name || 'Your Name'}</h3>
                    <p className="text-sm text-muted-foreground">{email || 'your@email.com'}</p>
                    <Badge variant="secondary" className="mt-2">Free Plan</Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea 
                      id="bio"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleProfileUpdate}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
                <CardDescription>Keep your account secure with strong authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" placeholder="Enter current password" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" placeholder="Enter new password" />
                    <Progress value={60} className="h-1" />
                    <p className="text-xs text-muted-foreground">Password strength: Medium</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handlePasswordChange}>
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">Use an app to generate codes</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Setup</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-muted-foreground">Receive codes via email</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Preferences</CardTitle>
                <CardDescription>Choose what emails you'd like to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Product Updates</Label>
                      <p className="text-sm text-muted-foreground">New features and improvements</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Survey Responses</Label>
                      <p className="text-sm text-muted-foreground">When someone completes your survey</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Summary of your survey performance</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">Tips, best practices, and offers</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleNotificationSave}>Save Preferences</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>Control notifications within the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show browser notifications</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">Play sounds for important events</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Free Plan</h3>
                        <Badge variant="secondary">Current</Badge>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Up to 3 surveys
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          100 responses per month
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Basic analytics
                        </li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">$0</p>
                      <p className="text-sm text-muted-foreground">/month</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Pro Plan</h3>
                        <Badge className="bg-primary">Recommended</Badge>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Unlimited surveys
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          10,000 responses per month
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Advanced analytics & AI insights
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Priority support
                        </li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">$29</p>
                      <p className="text-sm text-muted-foreground">/month</p>
                    </div>
                  </div>
                  <Button className="w-full mt-4" size="lg">
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View your past transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No billing history available</p>
                  <p className="text-sm mt-1">Transactions will appear here once you upgrade</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Language</Label>
                      <p className="text-sm text-muted-foreground">Select your preferred language</p>
                    </div>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ko">한국어</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="w-4 h-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Timezone</Label>
                      <p className="text-sm text-muted-foreground">Used for scheduling and reports</p>
                    </div>
                    <Select defaultValue="seoul">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seoul">Seoul (GMT+9)</SelectItem>
                        <SelectItem value="tokyo">Tokyo (GMT+9)</SelectItem>
                        <SelectItem value="singapore">Singapore (GMT+8)</SelectItem>
                        <SelectItem value="london">London (GMT+0)</SelectItem>
                        <SelectItem value="newyork">New York (GMT-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>Manage your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics & Cookies</Label>
                    <p className="text-sm text-muted-foreground">Help us improve by sharing usage data</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label>Export Data</Label>
                  <p className="text-sm text-muted-foreground">Download all your surveys and responses</p>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>Manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Chrome on Windows • Seoul, Korea</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" onClick={logout} className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AlertDialog>
                  <div className="p-4 border border-destructive/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently remove your account and all data
                        </p>
                      </div>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                    </div>
                  </div>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground">
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
