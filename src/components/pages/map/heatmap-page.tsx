'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity } from 'lucide-react';

export default function HeatmapPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Heatmap Analysis
          </CardTitle>
          <CardDescription>
            Visualize point density and identify spatial clusters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 gap-4">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-950/30">
              <Activity className="w-12 h-12 text-orange-600 animate-pulse" />
            </div>
            <p className="text-muted-foreground font-medium">Density Estimation Engine Ready</p>
            <p className="text-xs text-muted-foreground">Upload data with Lat/Long to generate heat gradients.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
