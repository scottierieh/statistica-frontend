
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign, LineChart, Zap, Target } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";

export default function DashboardHubPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-headline font-bold">Skarii Dashboard</h1>
        </div>
         <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Available Tools</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary"/>
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
                <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary"/>
                            Machine Learning
                        </CardTitle>
                        <CardDescription>
                            Build, train, and deploy machine learning models for regression, classification, and more.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/machine-learning" target="_blank" rel="noopener noreferrer">Launch Machine Learning</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <FastForward className="h-5 w-5 text-primary"/>
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
                <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary"/>
                            Survey Tool
                        </CardTitle>
                        <CardDescription>
                            Design, distribute, and analyze surveys with an integrated, easy-to-use tool.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/survey?id=1" target="_blank" rel="noopener noreferrer">Launch Survey Tool</Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary"/>
                            Financial Modeling
                        </CardTitle>
                        <CardDescription>
                           Conduct portfolio analysis, company valuation, and financial forecasting.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/financial-modeling" target="_blank" rel="noopener noreferrer">Launch Financial Modeling</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary"/>
                            Decision Analytics
                        </CardTitle>
                        <CardDescription>
                            Solve complex optimization problems and perform quantitative analysis for decision making.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/optimization" target="_blank" rel="noopener noreferrer">Launch Tool</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
