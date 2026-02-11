'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Layers } from 'lucide-react';

export default function ClusterMapPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Cluster Map
          </CardTitle>
          <CardDescription>
            Group nearby points automatically for clearer visualization at high zoom levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 gap-4">
            <div className="p-4 rounded-full bg-violet-100 dark:bg-violet-950/30">
              <Layers className="w-12 h-12 text-violet-600" />
            </div>
            <p className="text-muted-foreground font-medium">Point Clustering Engine Ready</p>
            <p className="text-xs text-muted-foreground">Supports K-Means and DBSCAN spatial clustering.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
