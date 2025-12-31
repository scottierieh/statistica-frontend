'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeftRight } from "lucide-react";

export default function PrePostPolicyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6" />
            Pre/Post Policy Comparison
        </CardTitle>
        <CardDescription>
          This component is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page will allow you to compare data before and after a policy implementation.</p>
      </CardContent>
    </Card>
  );
}
