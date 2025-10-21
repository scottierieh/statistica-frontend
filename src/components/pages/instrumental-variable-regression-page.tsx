
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link2 } from "lucide-react";

export default function InstrumentalVariableRegressionPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Link2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Instrumental Variable (IV) Regression</CardTitle>
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
