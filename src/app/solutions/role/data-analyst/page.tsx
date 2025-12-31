
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DataAnalystSolutionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="absolute top-4 left-4">
            <Button asChild variant="outline">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
        </div>
      <Card className="w-full max-w-2xl text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">Solutions for Data Analysts</CardTitle>
          <CardDescription className="text-base mt-2">
            This page is currently under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Learn how our platform can streamline your data analysis workflow. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
