'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface PageProps {
  data: any[];
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample?: (example: any) => void;
}

export default function PublicServiceTrendPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: PageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Public Service Usage Trend
          </CardTitle>
          <CardDescription>
            Analyze trends in public service utilization over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>This analysis page is under development.</p>
            <p className="text-sm mt-2">Upload data to begin analysis.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
