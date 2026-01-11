
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardClientLayout from '@/components/dashboard-client-layout';
import { ArrowLeft, Calculator, Users, Mail, PlusCircle, Trash2, Loader2, Send } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface Invitation {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  status: 'pending' | 'accepted';
  createdAt: string;
}

function TeamSettings() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newInvites, setNewInvites] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const fetchInvitations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/teams/invitations');
            if (!response.ok) throw new Error('Failed to fetch invitations');
            const data = await response.json();
            setInvitations(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const handleSendInvites = async () => {
        const emails = newInvites.split(/[\n,]/).map(email => email.trim()).filter(Boolean);
        if (emails.length === 0) {
            toast({ variant: 'destructive', title: 'No emails entered' });
            return;
        }

        setIsSending(true);
        try {
            const responses = await Promise.all(emails.map(email =>
                fetch('/api/teams/invitations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role: 'Member' })
                })
            ));

            const successfulInvites = responses.filter(res => res.ok).length;
            if (successfulInvites > 0) {
                toast({ title: 'Success', description: `${successfulInvites} invitation(s) sent.` });
                setNewInvites('');
                fetchInvitations();
            }

            const failedInvites = responses.length - successfulInvites;
            if (failedInvites > 0) {
                throw new Error(`${failedInvites} invitation(s) failed to send.`);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteInvite = async (invitationId: string) => {
        try {
            const response = await fetch(`/api/teams/invitations?id=${invitationId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete invitation');
            toast({ title: 'Success', description: 'Invitation has been revoked.' });
            fetchInvitations();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleUpdateRole = async (invitationId: string, role: 'Admin' | 'Member') => {
        try {
            const response = await fetch(`/api/teams/invitations/${invitationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Failed to update role');
            }

            toast({ title: 'Success', description: "Member's role has been updated." });
            fetchInvitations();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail /> Invite New Members</CardTitle>
                    <CardDescription>Enter email addresses separated by commas or new lines.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="invites">Email Addresses</Label>
                        <Textarea 
                            id="invites"
                            placeholder="friend@example.com, colleague@work.com"
                            value={newInvites}
                            onChange={(e) => setNewInvites(e.target.value)}
                            rows={3}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSendInvites} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                        Send Invites
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Team Members & Invitations</CardTitle>
                    <CardDescription>Manage pending invitations and existing team members.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Invited</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map(invite => (
                                    <TableRow key={invite.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://i.pravatar.cc/150?u=${invite.email}`} />
                                                    <AvatarFallback>{invite.email.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{invite.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={invite.status === 'pending' ? 'secondary' : 'default'}>
                                                {invite.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                             <Select 
                                                defaultValue={invite.role} 
                                                onValueChange={(newRole) => handleUpdateRole(invite.email, newRole as 'Admin' | 'Member')}
                                            >
                                                <SelectTrigger className="w-28">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Member">Member</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteInvite(invite.email)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function TeamSettingsPage() {
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
                            <h1 className="text-xl font-headline font-bold">Team Settings</h1>
                        </Link>
                    </div>
                    <div className="w-[180px]" />
                </header>
                <main className="flex-1 p-4 md:p-8 lg:p-12">
                   <div className="max-w-4xl mx-auto">
                      <TeamSettings />
                   </div>
                </main>
            </div>
        </DashboardClientLayout>
    );
}
