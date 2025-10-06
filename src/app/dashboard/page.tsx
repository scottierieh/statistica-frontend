
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign, LineChart, Target, Zap } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatisticaApp from "@/components/statistica-app";
import MachineLearningApp from "@/components/machine-learning-app";
import SimulationApp from "@/components/simulation-app";
import Survey2Dashboard from "./survey2/page";
import FinancialModelingApp from "@/components/financial-modeling-app";
import OptimizationApp from "@/components/optimization-app";


function DashboardHub() {
  const { user } = useAuth();

  const tools = [
      { id: "statistica", icon: Calculator, title: "Statistica", component: <StatisticaApp /> },
      { id: "machine-learning", icon: BrainCircuit, title: "Machine Learning", component: <MachineLearningApp /> },
      { id: "simulation", icon: FastForward, title: "Simulation", component: <SimulationApp /> },
      { id: "survey", icon: ClipboardList, title: "Survey Tool", component: <Survey2Dashboard /> },
      { id: "financial-modeling", icon: DollarSign, title: "Financial Modeling", component: <FinancialModelingApp /> },
      { id: "optimization", icon: Target, title: "Decision Analytics", component: <OptimizationApp /> },
  ];

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
        <Tabs defaultValue="statistica" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
            {tools.map(tool => (
              <TabsTrigger key={tool.id} value={tool.id}>
                <tool.icon className="w-4 h-4 mr-2" />
                {tool.title}
              </TabsTrigger>
            ))}
          </TabsList>
           {tools.map(tool => (
              <TabsContent key={tool.id} value={tool.id}>
                {tool.component}
              </TabsContent>
            ))}
        </Tabs>
      </main>
    </div>
  );
}

export default function DashboardHubPage() {
    return (
        <DashboardClientLayout>
            <DashboardHub />
        </DashboardClientLayout>
    )
}
