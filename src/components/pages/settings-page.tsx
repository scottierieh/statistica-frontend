
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

export default function SettingsPage() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleProfileUpdate = () => {
    if (user) {
      const updatedUser = { ...user, name, email };
      login(updatedUser); // This will update context and localStorage
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been successfully saved.',
      });
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter>
          <Button>Change Password</Button>
        </CardFooter>
      </Card>

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
    </div>
  );
}
