'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function FeatureAdoptionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Feature Adoption Analysis
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to analyze the adoption rates of new features.</p>
      </CardContent>
    </Card>
  );
}
