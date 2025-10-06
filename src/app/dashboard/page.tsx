
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign, LineChart, Zap, Target, MoveRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { motion } from "framer-motion";

function ToolCard({ icon: Icon, title, description, href, cta }: { icon: React.ElementType, title: string, description: string, href: string, cta: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full text-center items-center justify-between p-6 bg-gradient-to-br from-card to-muted/30 hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300">
        <CardHeader className="p-0 mb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Icon size={32} />
          </div>
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
          <CardDescription className="mt-2 text-sm">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 w-full">
          <Button asChild className="w-full group">
            <Link href={href} target="_blank" rel="noopener noreferrer">
              {cta}
              <MoveRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}


function DashboardHub() {
  const { user } = useAuth();

  const tools = [
      { icon: Calculator, title: "Statistica", description: "Your intelligent statistical analysis tool. Upload data, run analyses, and generate AI-powered insights.", href: "/dashboard/statistica", cta: "Launch Statistica" },
      { icon: BrainCircuit, title: "Machine Learning", description: "Build, train, and deploy machine learning models for regression, classification, and more.", href: "/dashboard/machine-learning", cta: "Launch ML Tool" },
      { icon: FastForward, title: "Simulation", description: "Model and simulate complex systems to predict outcomes and test scenarios.", href: "/dashboard/simulation", cta: "Launch Simulation" },
      { icon: ClipboardList, title: "Survey Tool", description: "Design, distribute, and analyze surveys with an integrated, easy-to-use tool.", href: "/dashboard/survey2", cta: "Launch Survey Tool" },
      { icon: DollarSign, title: "Financial Modeling", description: "Conduct portfolio analysis, company valuation, and financial forecasting.", href: "/dashboard/financial-modeling", cta: "Launch Finance Tool" },
      { icon: Target, title: "Decision Analytics", description: "Solve complex optimization problems and perform quantitative analysis for decision making.", href: "/dashboard/optimization", cta: "Launch Analytics" },
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
        <div className="container">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Available Tools</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
               {tools.map(tool => (
                  <ToolCard key={tool.title} {...tool} />
               ))}
            </div>
        </div>
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
