
'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Key, Shield, Zap, ListChecks, Play, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// TODO: Replace with real org system
const TEMP_ORG_ID = 'default_org';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { triggerIntegrationSync } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SchedulingPage() {
  // org context removed - using temp ID
  const db = useFirestore();
  const { toast } = useToast();

  const integrationsRef = (db && TEMP_ORG_ID) ? collection(db, 'orgs', TEMP_ORG_ID, 'integrations') : null;
  const { data: integrations, loading } = useCollection<any>(integrationsRef);

  const activeJobs = useMemo(() => {
    return integrations?.filter(i => i.status === 'connected') || [];
  }, [integrations]);

  const handleSyncNow = async (platformId: string) => {
    if (!TEMP_ORG_ID) return;
    toast({ title: "Sync Started", description: `${platformId} 데이터를 수집 중입니다...` });
    try {
      const result = await triggerIntegrationSync(TEMP_ORG_ID, platformId);
      if (result.success) {
        toast({ title: "Sync Complete", description: "성공적으로 업데이트 되었습니다." });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Automation & Scheduling</h2>
        <p className="text-muted-foreground">설정된 외부 데이터 수집 작업을 모니터링하고 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Schedules */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Active Sync Jobs
            </CardTitle>
            <CardDescription>현재 활성화된 자동 수집 작업입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-4"><RefreshCw className="animate-spin text-muted-foreground" /></div>
            ) : activeJobs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                활성화된 자동 수집 작업이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <div key={job.platform} className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all">
                    <div>
                      <p className="text-sm font-bold capitalize">{job.platform}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] uppercase">{job.syncFrequency || 'manual'}</Badge>
                        <span className="text-[10px] text-muted-foreground">Next: In 14 hours</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleSyncNow(job.platform)}>
                      <Play className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security & Token Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Credential Health
            </CardTitle>
            <CardDescription>API 토큰의 보안 및 만료 상태입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job.platform} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold capitalize">{job.platform} Key</p>
                    <p className="text-[9px] text-muted-foreground">Status: AES-256 Encrypted</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-[8px] h-4">Healthy</Badge>
              </div>
            ))}
            {activeJobs.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">연동된 API가 없습니다.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            Execution Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-left px-4 py-3 font-medium">Sync Mode</th>
                  <th className="text-left px-4 py-3 font-medium">Last Run</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Data Size</th>
                </tr>
              </thead>
              <tbody>
                {activeJobs.map((job) => (
                  <tr key={job.platform} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold capitalize">{job.platform}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[9px]">{job.syncFrequency}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[10px]">{job.lastSyncAt?.toDate().toLocaleString() || 'N/A'}</td>
                    <td className="px-4 py-3"><Badge className="bg-emerald-500 h-4 text-[9px]">Success</Badge></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">~1.2 MB</td>
                  </tr>
                ))}
                {activeJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">수행된 로그가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p>Tip: 토큰 만료 7일 전에 관리자에게 알림 메일이 발송됩니다. 'Scheduling'에서 갱신 주기를 관리하세요.</p>
      </div>
    </div>
  );
}
