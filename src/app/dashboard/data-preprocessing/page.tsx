
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DatabaseZap } from "lucide-react";

export default function DataPreprocessingPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full p-4 md:p-8">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <DatabaseZap className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Data Preprocessing</CardTitle>
          <CardDescription>
            This feature is currently under construction. Tools for data cleaning, variable creation, and more are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
