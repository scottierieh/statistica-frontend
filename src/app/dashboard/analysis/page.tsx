
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calculator, Paintbrush, DatabaseZap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const analysisTools = [
  {
    id: "statistical-analysis",
    href: "/dashboard/statistica",
    icon: Calculator,
    title: "Statistical Analysis",
    description: "Analyze data with over 40 statistical techniques and generate AI-powered reports.",
  },
  {
    id: "data-preprocessing",
    href: "/dashboard/data-preprocessing",
    icon: DatabaseZap,
    title: "Data Preprocessing",
    description: "Prepare your data for analysis with tools for handling missing values, variable transformation, and outlier detection.",
  },
  {
    id: "visualization",
    href: "/dashboard/visualization",
    icon: Paintbrush,
    title: "Visualization",
    description: "Visually explore your data and discover insights through a variety of charts and graphs.",
  },
];

function AnalysisToolCard({ tool }: { tool: typeof analysisTools[0] }) {
  return (
    <Link href={tool.href} className="block h-full">
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card p-6 text-left shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/20 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative z-10 flex flex-col">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            <tool.icon className="h-7 w-7" />
          </div>
          <CardTitle className="font-headline text-2xl">{tool.title}</CardTitle>
          <CardDescription className="mt-2 text-base text-muted-foreground">
            {tool.description}
          </CardDescription>
        </div>
        <div className="flex-grow"></div>
        <div className="relative z-10 mt-6 flex items-center justify-end text-sm font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </Card>
    </Link>
  );
}

function AnalysisHub() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-headline font-bold">Analysis Hub</h1>
        </Link>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <h2 className="text-3xl font-bold font-headline mb-8 text-center text-foreground">Choose Analysis Type</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {analysisTools.map((tool) => (
              <AnalysisToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function AnalysisPage() {
    return (
        <DashboardClientLayout>
            <AnalysisHub />
        </DashboardClientLayout>
    )
}
