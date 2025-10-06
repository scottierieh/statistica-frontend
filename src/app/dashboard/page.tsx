
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign, LineChart, Target } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { motion } from "framer-motion";

function ToolCard({ icon: Icon, title, description, href }: { icon: React.ElementType, title: string, description: string, href: string }) {
  return (
    <Link href={href} className="h-full block">
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        className="h-full"
      >
        <Card className="flex flex-col h-full text-center items-center justify-start p-6 bg-gradient-to-br from-card to-muted/30 hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300">
          <CardHeader className="p-0">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Icon size={32} />
            </div>
            <CardTitle className="font-headline text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <CardDescription className="text-sm">
              {description}
            </CardDescription>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}


function DashboardHub() {
  const { user } = useAuth();

  const tools = [
      { icon: Calculator, title: "Statistica", description: "Your intelligent statistical analysis tool. Upload data, run analyses, and generate AI-powered insights.", href: "/dashboard/statistica" },
      { icon: BrainCircuit, title: "Machine Learning", description: "Build, train, and deploy machine learning models for regression, classification, and more.", href: "/dashboard/machine-learning" },
      { icon: FastForward, title: "Simulation", description: "Model and simulate complex systems to predict outcomes and test scenarios.", href: "/dashboard/simulation" },
      { icon: ClipboardList, title: "Survey Tool", description: "Design, distribute, and analyze surveys with an integrated, easy-to-use tool.", href: "/dashboard/survey2" },
      { icon: DollarSign, title: "Financial Modeling", description: "Conduct portfolio analysis, company valuation, and financial forecasting.", href: "/dashboard/financial-modeling" },
      { icon: Target, title: "Decision Analytics", description: "Solve complex optimization problems and perform quantitative analysis for decision making.", href: "/dashboard/optimization" },
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
