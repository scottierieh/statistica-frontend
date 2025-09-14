import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import Link from "next/link";

export default function DashboardHubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-headline font-bold">Statistica Dashboard</h1>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Available Tools</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Calculator className="h-5 w-5"/>
                            Statistica
                        </CardTitle>
                        <CardDescription>
                            Your intelligent statistical analysis tool. Upload data, run analyses, and generate AI-powered insights.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/statistica">Launch Statistica</Link>
                        </Button>
                    </CardContent>
                </Card>

                 <Card className="flex flex-col items-center justify-center border-dashed border-2 bg-transparent">
                    <CardHeader className="text-center">
                        <CardTitle className="text-muted-foreground font-normal">More Tools Coming Soon</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
