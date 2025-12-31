'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function EffectivenessPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Check className="w-6 h-6" />
            Policy Effectiveness Analysis
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to analyze the effectiveness of policies.</p>
      </CardContent>
    </Card>
  );
}
