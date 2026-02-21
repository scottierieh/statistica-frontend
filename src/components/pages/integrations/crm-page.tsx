
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, CheckCircle2, Key, Loader2, RefreshCw } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// TODO: Replace with real org system
const TEMP_ORG_ID = 'default_org';
import { useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { triggerIntegrationSync } from '@/app/actions';
import { cn } from '@/lib/utils';

export default function CRMPage() {
  // org context removed - using temp ID
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedCRM, setSelectedCRM] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const integrationsRef = (db && TEMP_ORG_ID) ? collection(db, 'orgs', TEMP_ORG_ID, 'integrations') : null;
  const { data: integrationsData } = useCollection<any>(integrationsRef);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !TEMP_ORG_ID || !selectedCRM) return;

    setIsConnecting(true);
    try {
      await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', selectedCRM), {
        orgId: TEMP_ORG_ID,
        platform: selectedCRM,
        status: 'connected',
        credentials: { instanceUrl, apiKey },
        updatedAt: serverTimestamp()
      });

      toast({ title: "CRM Connected", description: `${selectedCRM} 계정이 성공적으로 연동되었습니다.` });
      setSelectedCRM(null);
      setInstanceUrl('');
      setApiKey('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async (platformId: string) => {
    if (!TEMP_ORG_ID) return;
    setIsSyncing(platformId);
    try {
      const result = await triggerIntegrationSync(TEMP_ORG_ID, platformId);
      if (result.success) {
        toast({ title: "Data Synced", description: "CRM 고객 수익성 데이터를 가져왔습니다." });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsSyncing(null);
    }
  };

  const systems = [
    { id: 'salesforce', name: 'Salesforce', desc: 'Enterprise Pipeline Sync' },
    { id: 'hubspot', name: 'HubSpot', desc: 'Inbound Deal Tracking' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">CRM Systems Integration</h2>
        <p className="text-muted-foreground">고객 데이터와 매출 파이프라인을 연동하여 LTV 및 수익성을 분석합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {systems.map(s => {
          const integration = integrationsData?.find(i => i.platform === s.id);
          const isConnected = integration?.status === 'connected';

          return (
            <Card key={s.id} className={cn(isConnected && "border-l-4 border-l-primary")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{s.name}</CardTitle>
                  <Badge variant={isConnected ? "default" : "outline"} className={isConnected ? "bg-emerald-500" : ""}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <CardDescription>{s.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span className="font-mono text-xs">{integration.lastSyncAt?.toDate().toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedCRM(s.id)}>Settings</Button>
                      <Button size="sm" className="flex-1" onClick={() => handleSync(s.id)} disabled={isSyncing === s.id}>
                        {isSyncing === s.id ? <Loader2 className="animate-spin w-3 h-3 mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        Sync Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Users className="w-8 h-8 text-muted-foreground mb-3 opacity-20" />
                    <Button variant="secondary" size="sm" onClick={() => setSelectedCRM(s.id)}>Authorize {s.name}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Field Mapping & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { field: 'Customer ID', source: 'CRM.UID', mapped: 'User.id' },
              { field: 'Total ARR', source: 'CRM.Amount', mapped: 'Project.revenue' },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30 text-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="font-bold w-20">{m.field}</span>
                <span className="text-muted-foreground font-mono flex-1">{m.source} ➔ {m.mapped}</span>
                <Badge variant="secondary" className="text-[8px] h-4">Encrypted</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCRM} onOpenChange={(open) => !open && setSelectedCRM(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleConnect}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                CRM Authorization
              </DialogTitle>
              <DialogDescription>{selectedCRM?.toUpperCase()} API 연동 정보를 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-xs">Instance URL (또는 Workspace ID)</Label>
                <Input value={instanceUrl} onChange={e => setInstanceUrl(e.target.value)} placeholder="https://na1.salesforce.com" required />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">API Key / OAuth Token</Label>
                <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isConnecting}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect System
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
