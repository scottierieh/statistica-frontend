'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function PerformanceAnalysisPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <LineChart className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline">Performance Analysis</CardTitle>
          <CardDescription>
            This section is under construction. In-depth performance metrics and attribution analysis are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
