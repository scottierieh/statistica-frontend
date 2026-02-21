
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, BarChart, Settings, ExternalLink, Key, RefreshCw, Loader2 } from "lucide-react";
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
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { triggerIntegrationSync } from '@/app/actions';

const adPlatforms = [
  { id: 'google_ads', name: 'Google Ads', icon: Megaphone, color: 'text-blue-500' },
  { id: 'meta_ads', name: 'Meta (FB/IG) Ads', icon: Megaphone, color: 'text-blue-700' },
  { id: 'linkedin_ads', name: 'LinkedIn Ads', icon: Megaphone, color: 'text-blue-900' },
];

export default function AdsApiPage() {
  // org context removed - using temp ID
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [developerToken, setDeveloperToken] = useState('');
  const [frequency, setSyncFrequency] = useState('daily');

  const integrationsRef = (db && TEMP_ORG_ID) ? collection(db, 'orgs', TEMP_ORG_ID, 'integrations') : null;
  const { data: integrationsData } = useCollection<any>(integrationsRef);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !TEMP_ORG_ID || !selectedPlatform) return;

    setIsConnecting(true);
    try {
      await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', selectedPlatform), {
        orgId: TEMP_ORG_ID,
        platform: selectedPlatform,
        status: 'connected',
        syncFrequency: frequency,
        credentials: {
          clientId,
          clientSecret,
          developerToken
        },
        updatedAt: serverTimestamp()
      });

      toast({ title: "Ads API Connected", description: `${selectedPlatform} 연동 정보가 저장되었습니다.` });
      setSelectedPlatform(null);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setClientId('');
    setClientSecret('');
    setDeveloperToken('');
  };

  const handleSync = async (platformId: string) => {
    if (!TEMP_ORG_ID) return;
    setIsSyncing(platformId);
    try {
      const result = await triggerIntegrationSync(TEMP_ORG_ID, platformId);
      if (result.success) {
        toast({ title: "Sync Complete", description: "광고 성과 데이터를 성공적으로 수집했습니다." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Ads Performance API</h2>
        <p className="text-muted-foreground">광고 플랫폼별 성과 데이터를 수집하여 ROI 분석을 자동화합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {adPlatforms.map((p) => {
                const integration = integrationsData?.find(i => i.platform === p.id);
                const isConnected = integration?.status === 'connected';
                
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-primary/5", p.color)}>
                        <p.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">Sync: {integration?.syncFrequency || 'None'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={isConnected ? 'default' : 'outline'} className={cn("text-[9px] h-4", isConnected && "bg-emerald-500")}>
                        {isConnected ? 'Active' : 'Setup Required'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPlatform(p.id)} className="h-8 text-[10px]">
                        {isConnected ? 'Configure' : 'Connect'}
                      </Button>
                      {isConnected && (
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSync(p.id)} disabled={isSyncing === p.id}>
                          <RefreshCw className={cn("w-3.5 h-3.5", isSyncing === p.id && "animate-spin")} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Reporting Config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-bold mb-1">Currency</p>
              <p className="text-sm font-mono">KRW (₩)</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-bold mb-1">Lookback Window</p>
              <p className="text-sm">30 Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedPlatform} onOpenChange={(open) => !open && setSelectedPlatform(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleConnect}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Ads API Integration
              </DialogTitle>
              <DialogDescription>{selectedPlatform?.toUpperCase()} 개발자 콘솔에서 발급받은 키를 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-xs">Client ID</Label>
                <Input value={clientId} onChange={e => setClientId(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Client Secret</Label>
                <Input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Developer / Access Token</Label>
                <Input type="password" value={developerToken} onChange={e => setDeveloperToken(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold">Sync Frequency</Label>
                <Select value={frequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isConnecting}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Connect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
