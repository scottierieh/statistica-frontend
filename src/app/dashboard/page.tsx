
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign } from "lucide-react";
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                            <Link href="/dashboard/statistica" target="_blank" rel="noopener noreferrer">Launch Statistica</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5"/>
                            Deep Learning
                        </CardTitle>
                        <CardDescription>
                            Build, train, and deploy deep learning models with a powerful, intuitive interface.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/deep-learning" target="_blank" rel="noopener noreferrer">Launch Deep Learning</Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <ClipboardList className="h-5 w-5"/>
                            Survey
                        </CardTitle>
                        <CardDescription>
                           Create, distribute, and analyze surveys with powerful built-in statistical tools.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/survey" target="_blank" rel="noopener noreferrer">Launch Survey</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <FastForward className="h-5 w-5"/>
                            Simulation
                        </CardTitle>
                        <CardDescription>
                           Model and simulate complex systems to predict outcomes and test scenarios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/simulation" target="_blank" rel="noopener noreferrer">Launch Simulation</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
