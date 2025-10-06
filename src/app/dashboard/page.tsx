
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
import Survey2Dashboard from "./survey2/page";

function UnderConstructionCard({ title, icon: Icon }: { title: string, icon: React.ElementType }) {
  return (
    <div className="flex flex-1 items-center justify-center h-full pt-10">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline">{title}</CardTitle>
          <CardDescription>
            This section is under construction. Powerful tools for {title.toLowerCase()} are coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Stay tuned for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}


function DashboardHub() {
  const { user } = useAuth();

  const tools = [
      { id: "statistica", icon: Calculator, title: "Statistica", component: <StatisticaApp /> },
      { id: "machine-learning", icon: BrainCircuit, title: "Machine Learning", component: <UnderConstructionCard title="Machine Learning" icon={BrainCircuit} /> },
      { id: "simulation", icon: FastForward, title: "Simulation", component: <UnderConstructionCard title="Simulation" icon={FastForward} /> },
      { id: "survey", icon: ClipboardList, title: "Survey Tool", component: <Survey2Dashboard /> },
      { id: "financial-modeling", icon: DollarSign, title: "Financial Modeling", component: <UnderConstructionCard title="Financial Modeling" icon={DollarSign} /> },
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
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
