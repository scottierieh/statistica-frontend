
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { 
  Instagram, Facebook, Twitter, Youtube, 
  RefreshCw, Key, ShieldCheck, Loader2, CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
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
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { fetchIntegrationData } from '@/app/actions';

const platforms = [
  { id: 'facebook', name: 'Facebook Graph API', icon: Facebook, color: 'text-blue-600', oauthEnabled: true },
  { id: 'instagram', name: 'Instagram Graph API', icon: Instagram, color: 'text-pink-600', oauthEnabled: true },
  { id: 'twitter', name: 'X (Twitter) v2 API', icon: Twitter, color: 'text-slate-900', oauthEnabled: false },
  { id: 'youtube', name: 'YouTube Data API', icon: Youtube, color: 'text-red-600', oauthEnabled: false },
];

export default function SNSApiPage() {
  // org context removed - using temp ID
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [frequency, setSyncFrequency] = useState('daily');

  // Handle OAuth callback data from URL
  useEffect(() => {
    const success = searchParams?.get('success');
    const token = searchParams?.get('accessToken');
    const platform = searchParams?.get('platform');
    const error = searchParams?.get('error');
    
    if (success === 'facebook' && token && platform && db && TEMP_ORG_ID) {
      const saveToken = async () => {
        try {
          await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', platform), {
            orgId: TEMP_ORG_ID,
            platform,
            status: 'connected',
            syncFrequency: 'daily',
            credentials: { accessToken: token },
            updatedAt: serverTimestamp(),
          }, { merge: true });
          toast({ title: "Connected", description: `${platform} linked successfully.` });
          router.replace('/dashboard/data-studio/integrations');
        } catch (e) {
          toast({ variant: "destructive", title: "Save Failed", description: "Failed to save API token." });
        }
      };
      saveToken();
    }

    if (error) {
      toast({ variant: "destructive", title: "Connection Failed", description: decodeURIComponent(error) });
      router.replace('/dashboard/data-studio/integrations');
    }
  }, [searchParams, db, TEMP_ORG_ID, toast, router]);

  const integrationsRef = (db && TEMP_ORG_ID) ? collection(db, 'orgs', TEMP_ORG_ID, 'integrations') : null;
  const { data: integrationsData } = useCollection<any>(integrationsRef);

  const handlePlatformClick = (platformId: string) => {
    setSelectedPlatform(platformId);
    setIsManualMode(false);
  };

  const handleOAuthConnect = () => {
    if (!TEMP_ORG_ID || !selectedPlatform) return;
    if (selectedPlatform === 'facebook' || selectedPlatform === 'instagram') {
      window.location.href = `/api/auth/meta?orgId=${TEMP_ORG_ID}`;
    } else {
      setIsManualMode(true);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !TEMP_ORG_ID || !selectedPlatform) return;

    setIsConnecting(true);
    try {
      await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', selectedPlatform), {
        orgId: TEMP_ORG_ID,
        platform: selectedPlatform,
        status: 'connected',
        syncFrequency: frequency,
        credentials: { accessToken: accessToken.trim() },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Connected", description: `${selectedPlatform} credentials saved.` });
      setSelectedPlatform(null);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setAccessToken('');
    setIsManualMode(false);
  };

  const handleSync = async (platformId: string) => {
    if (!TEMP_ORG_ID || !db) return;
    const integration = integrationsData?.find(i => i.platform === platformId);
    if (!integration) return;

    setIsSyncing(platformId);
    try {
      const result = await fetchIntegrationData(TEMP_ORG_ID, platformId, integration.credentials);
      if (result.success && result.csv) {
        // Save to shared-files collection using client SDK
        const fileId = `sync_${platformId}_${Date.now()}`;
        await setDoc(doc(db, 'shared-files', fileId), {
          fileName: `${platformId}_data_${new Date().toISOString().split('T')[0]}.csv`,
          fileSize: result.csv.length,
          fileType: '.csv',
          orgId: TEMP_ORG_ID,
          uploadedBy: 'system_sync',
          uploadedByEmail: 'automation@statistica.ai',
          description: `${platformId} automated sync`,
          createdAt: serverTimestamp(),
          downloadURL: 'data:text/csv;charset=utf-8,' + encodeURIComponent(result.csv),
        });

        await setDoc(doc(db, 'orgs', TEMP_ORG_ID, 'integrations', platformId), {
            lastSyncAt: serverTimestamp(),
            lastSyncStats: result.stats
        }, { merge: true });

        toast({ title: "Sync Complete", description: "Latest metrics have been added to Shared Data." });
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
        <h2 className="text-2xl font-bold tracking-tight">SNS API Integrations</h2>
        <p className="text-muted-foreground">Connect your social media accounts to sync engagement and performance data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((p) => {
          const integration = integrationsData?.find(i => i.platform === p.id);
          const isConnected = integration?.status === 'connected';

          return (
            <Card key={p.id} className="relative overflow-hidden group border-muted/60 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl bg-muted/50", p.color)}>
                      <p.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isConnected ? 'default' : 'outline'} className={cn("text-[10px] px-1.5 h-4", isConnected && "bg-emerald-500")}>
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {isConnected && (
                    <Button variant="ghost" size="icon" onClick={() => handleSync(p.id)} disabled={isSyncing === p.id}>
                      <RefreshCw className={cn("w-4 h-4", isSyncing === p.id && "animate-spin")} />
                    </Button>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant={isConnected ? 'outline' : 'default'} 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handlePlatformClick(p.id)}
                  >
                    {isConnected ? 'Configure' : 'Connect'}
                  </Button>
                  {isConnected && (
                    <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => handleSync(p.id)} disabled={isSyncing === p.id}>
                      {isSyncing === p.id ? "Syncing..." : "Sync Now"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            API credentials are encrypted and stored in your workspace. 
            Firestore writes are performed directly from your browser to ensure security.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPlatform} onOpenChange={(open) => !open && setSelectedPlatform(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {selectedPlatform?.toUpperCase()} Integration
            </DialogTitle>
            <DialogDescription>
              {isManualMode 
                ? "Enter your API credentials manually below." 
                : "Choose how you would like to connect your account."}
            </DialogDescription>
          </DialogHeader>

          {!isManualMode ? (
            <div className="grid gap-4 py-4">
              <Button onClick={handleOAuthConnect} className="w-full h-12 gap-2">
                <ExternalLink className="w-4 h-4" />
                Automatic Connection (Recommended)
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
              </div>
              <Button variant="outline" onClick={() => setIsManualMode(true)} className="w-full h-12">
                Enter Token Manually
              </Button>
            </div>
          ) : (
            <form onSubmit={handleManualConnect} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label className="text-xs">Access Token</Label>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste token here" required />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold">Sync Frequency</Label>
                <Select value={frequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Only</SelectItem>
                    <SelectItem value="daily">Daily Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsManualMode(false)}>Back</Button>
                <Button type="submit" disabled={isConnecting}>
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save and Link
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
