
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function PanelDataRegressionPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Panel Data Regression</CardTitle>
          <CardDescription>
            This section is under construction. Advanced panel data models like Fixed Effects and Random Effects are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
