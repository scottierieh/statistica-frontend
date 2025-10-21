
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Repeat } from "lucide-react";

export default function TwoStageLeastSquaresPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Repeat className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Two-Stage Least Squares (2SLS)</CardTitle>
          <CardDescription>
            This section is under construction. Advanced regression models are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
