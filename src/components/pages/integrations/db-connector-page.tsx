'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Plus, Terminal, Lock, Globe, Server, Activity, Loader2, Trash2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
// TODO: Replace with real org system
const TEMP_ORG_ID = 'default_org';
import { useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { testDatabaseConnection } from '@/app/actions';
import { cn } from '@/lib/utils';

export default function DBConnectorPage() {
  // org context removed - using temp ID
  const db = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [platform, setPlatform] = useState('postgresql');
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [dbName, setDbName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Load existing DB integrations
  const integrationsRef = (db && TEMP_ORG_ID) ? collection(db, 'orgs', TEMP_ORG_ID, 'integrations') : null;
  const { data: allIntegrations, loading } = useCollection<any>(integrationsRef);
  
  const dbIntegrations = useMemo(() => {
    return allIntegrations?.filter(i => ['postgresql', 'mysql', 'sqlserver', 'mongodb'].includes(i.platform)) || [];
  }, [allIntegrations]);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await testDatabaseConnection({ host, port, dbName, username, password });
      if (result.success) {
        toast({ title: "Connection Success", description: result.error || "Connected successfully" });
      } else {
        toast({ variant: "destructive", title: "Connection Failed", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred during the test." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!TEMP_ORG_ID || !db) return;

    setIsSaving(true);
    try {
      const integrationId = `db_${platform}_${Date.now()}`;
      await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', integrationId), {
        orgId: TEMP_ORG_ID,
        name: name || `${platform.toUpperCase()} Source`,
        platform: platform,
        status: 'connected',
        credentials: {
          host,
          port,
          dbName,
          username,
          password
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "Database Connected", description: "The source has been added to your workspace." });
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!TEMP_ORG_ID || !db || !confirm("Are you sure you want to remove this connection?")) return;
    try {
      await deleteDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', id));
      toast({ title: "Connection Removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const resetForm = () => {
    setName('');
    setHost('');
    setPort('');
    setDbName('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Database Connectors</h2>
        <p className="text-muted-foreground">Securely connect to your SQL/NoSQL databases for live data reporting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dbIntegrations.map((conn) => (
          <DBCard 
            key={conn.id} 
            conn={conn} 
            onDelete={() => handleDelete(conn.id)} 
          />
        ))}
        
        <Card 
          className="border-2 border-dashed flex flex-col items-center justify-center p-6 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-bold">Add Connection</p>
          <p className="text-[10px] text-muted-foreground mt-1">AWS, GCP, Azure, On-prem</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security & IP Whitelisting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            To allow Statistica to connect to your database, please whitelist the following Static IP addresses in your firewall settings.
          </p>
          <div className="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-emerald-400 space-y-1">
            <p># Statistica Outbound Nodes</p>
            <p>34.120.155.82</p>
            <p>35.230.12.194</p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
            <Globe className="w-4 h-4 text-blue-500" />
            <p>SSL/TLS Encryption is mandatory for all direct DB connections.</p>
          </div>
        </CardContent>
      </Card>

      {/* Add Connection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Database Connection
              </DialogTitle>
              <DialogDescription>
                Configure connection parameters for your external data source.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform" className="text-xs">Database Type</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="sqlserver">SQL Server</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs">Display Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Main Prod DB" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 grid gap-2">
                  <Label htmlFor="host" className="text-xs">Host / IP</Label>
                  <Input id="host" value={host} onChange={e => setHost(e.target.value)} placeholder="db.example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port" className="text-xs">Port</Label>
                  <Input id="port" value={port} onChange={e => setPort(e.target.value)} placeholder="5432" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dbName" className="text-xs">Database Name</Label>
                <Input id="dbName" value={dbName} onChange={e => setDbName(e.target.value)} placeholder="analytics_db" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Terminal className="mr-2 h-4 w-4" />}
                Test
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Connection
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DBCard({ conn, onDelete }: any) {
  const credentials = conn.credentials || {};
  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{conn.name}</p>
              <Badge variant="outline" className="text-[8px] h-3 px-1 uppercase">{conn.platform}</Badge>
            </div>
          </div>
          <button 
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Server className="w-3 h-3" />
            <span className="font-mono truncate">{credentials.host}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Status: <span className="text-emerald-600 font-bold">Online</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]">
            <Terminal className="w-3 h-3 mr-1.5" />
            Query
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px]">
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
