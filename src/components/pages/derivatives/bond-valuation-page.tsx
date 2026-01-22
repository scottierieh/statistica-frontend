'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function BondValuationPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline">Bond Valuation</CardTitle>
          <CardDescription>
            This section is under construction. Tools for pricing bonds and calculating Yield to Maturity (YTM) are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
