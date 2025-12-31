'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CampaignPerformancePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Campaign Performance Evaluation
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to evaluate the performance of marketing campaigns.</p>
      </CardContent>
    </Card>
  );
}
