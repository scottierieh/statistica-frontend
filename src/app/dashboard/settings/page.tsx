
'use client';

import DashboardClientLayout from '@/components/dashboard-client-layout';
import { ArrowLeft, Calculator, Users, Mail, PlusCircle, Trash2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PolicyDialog } from '@/components/policy-dialog';
import { Checkbox } from '@/components/ui/checkbox';


function AccountSettings() {
    const [agreed, setAgreed] = useState(true);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                    Manage your account settings and set e-mail preferences.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="Your Name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="your.email@example.com" />
                </div>
                 <div className="flex items-start space-x-3 pt-2">
                        <Checkbox id="terms-account" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-0.5" />
                        <label
                            htmlFor="terms-account"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            I agree to the{' '}
                            <PolicyDialog triggerText="Terms of Service" title="Terms of Service" />
                            {' '}and{' '}
                            <PolicyDialog triggerText="Privacy Policy" title="Privacy Policy" />
                            .
                        </label>
                    </div>
            </CardContent>
            <CardFooter>
                <Button disabled={!agreed}>Save Changes</Button>
            </CardFooter>
        </Card>
    )
}

function TeamSettings() {
    const { toast } = useToast();
    const [emails, setEmails] = useState('');
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const fetchInvitations = async () => {
        setIsFetching(true);
        try {
            const response = await fetch('/api/teams/invitations');
            if (response.ok) {
                const data = await response.json();
                setInvitations(data);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch invitations.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while fetching invitations.' });
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleInvite = async () => {
        const emailList = emails.split(/[\s,;\n]+/).filter(email => email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

        if (emailList.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No valid emails',
                description: 'Please enter at least one valid email address.',
            });
            return;
        }

        setIsLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const email of emailList) {
            try {
                const response = await fetch('/api/teams/invitations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, role: 'Member' }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `Failed to invite ${email}.`);
                }
                successCount++;
            } catch (error: any) {
                errorCount++;
                toast({
                    variant: 'destructive',
                    title: `Failed to invite ${email}`,
                    description: error.message,
                });
            }
        }
        
        if (successCount > 0) {
            toast({
                title: 'Invitations Sent',
                description: `${successCount} invitation(s) sent successfully.`,
            });
            fetchInvitations();
        }
        
        if (errorCount === 0) {
            setEmails('');
        }

        setIsLoading(false);
    };
    
    const handleDeleteInvitation = async (invitationId: string) => {
        try {
            const response = await fetch(`/api/teams/invitations?id=${invitationId}`, { method: 'DELETE' });
            if (response.ok) {
                toast({ title: 'Success', description: 'Invitation removed.' });
                fetchInvitations(); // Refresh the list
            } else {
                throw new Error('Failed to remove invitation.');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove invitation.' });
        }
    }


    // Mock data for current team members until backend is ready
    const teamMembers = [
        { name: 'You', email: 'your.email@example.com', role: 'Admin', avatar: '/placeholder-user.jpg' },
        { name: 'Jane Doe', email: 'jane.doe@example.com', role: 'Member', avatar: '/placeholder-user.jpg' },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Invite New Members</CardTitle>
                    <CardDescription>Enter one or more email addresses separated by commas, spaces, or new lines.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3">
                        <Textarea
                            placeholder="new.member@example.com, another@example.com"
                            className="min-h-[100px]"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            disabled={isLoading}
                        />
                         <Button onClick={handleInvite} disabled={isLoading} className="w-full sm:w-auto self-end">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Send Invites
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>People who are currently part of your team.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teamMembers.map((member) => (
                                <TableRow key={member.email}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select defaultValue={member.role} disabled={member.name === 'You'}>
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                                <SelectItem value="Member">Member</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                         {member.name !== 'You' && (
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>People who have been invited but have not yet joined.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isFetching ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : invitations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell><Badge variant="outline">{invite.role}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteInvitation(invite.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">No pending invitations.</p>
                    )}
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
                      <Tabs defaultValue="team">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="account">Account</TabsTrigger>
                          <TabsTrigger value="team">Team</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account" className="mt-6">
                            <AccountSettings />
                        </TabsContent>
                        <TabsContent value="team" className="mt-6">
                          <TeamSettings />
                        </TabsContent>
                      </Tabs>
                   </div>
                </main>
            </div>
        </DashboardClientLayout>
    );
}
