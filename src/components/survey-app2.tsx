
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function SurveyApp2() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <ClipboardList className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Survey Tool</CardTitle>
          <CardDescription>
            This section allows you to create, manage, and analyze surveys.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Select a survey from the dashboard or create a new one to get started.</p>
        </CardContent>
      </Card>
    </div>
  );
}
