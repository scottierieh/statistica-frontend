
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CentralLimitTheoremPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="mx-auto bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <CardTitle className="font-headline">Central Limit Theorem</CardTitle>
          <CardDescription>
            This section is under construction. An interactive simulation for the Central Limit Theorem is coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
