'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";

export default function ProcessBottleneckPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Filter className="w-6 h-6" />
            Process Bottleneck Diagnosis
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to diagnose bottlenecks in your processes.</p>
      </CardContent>
    </Card>
  );
}
