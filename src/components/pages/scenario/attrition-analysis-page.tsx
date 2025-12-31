'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";

export default function AttritionAnalysisPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <UserX className="w-6 h-6" />
            Attrition & Retention Analysis
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to analyze employee attrition and retention rates.</p>
      </CardContent>
    </Card>
  );
}
