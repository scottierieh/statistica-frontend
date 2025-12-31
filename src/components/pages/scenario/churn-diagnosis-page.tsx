'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";

export default function ChurnDiagnosisPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <UserX className="w-6 h-6" />
            Churn & Drop-off Diagnosis
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to diagnose customer churn and user drop-off points.</p>
      </CardContent>
    </Card>
  );
}
