
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calculator, BrainCircuit, ClipboardList, FastForward, DollarSign, LineChart, Target, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const tools = [
  {
    id: "statistica",
    href: "/dashboard/statistica",
    icon: Calculator,
    title: "Statistica",
    description: "Your intelligent statistical analysis tool. Upload data, run analyses, and generate AI-powered insights.",
    disabled: false,
  },
  {
    id: "machine-learning",
    href: "#",
    icon: BrainCircuit,
    title: "Machine Learning",
    description: "Coming soon...",
    disabled: true,
  },
  {
    id: "simulation",
    href: "#",
    icon: FastForward,
    title: "Simulation",
    description: "Coming soon...",
    disabled: true,
  },
  {
    id: "survey",
    href: "/dashboard/survey2",
    icon: ClipboardList,
    title: "Survey Tool",
    description: "Design, distribute, and analyze surveys with an integrated, easy-to-use tool.",
    disabled: false,
  },
  {
    id: "financial-modeling",
    href: "#",
    icon: DollarSign,
    title: "Financial Modeling",
    description: "Coming soon...",
    disabled: true,
  },
  {
    id: "decision-analytics",
    href: "#",
    icon: Target,
    title: "Decision Analytics",
    description: "Coming soon...",
    disabled: true,
  },
];

function ToolCard({ tool }: { tool: typeof tools[0] }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => 
    tool.disabled ? (
        <div className="h-full">{children}</div>
    ) : (
        <Link href={tool.href} className="block h-full">
            {children}
        </Link>
    );

  return (
    <motion.div variants={cardVariants} className="h-full">
      <CardWrapper>
        <Card className={cn(
          "group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-card to-muted/50 p-6 text-center shadow-lg transition-all duration-300",
          tool.disabled ? "cursor-not-allowed bg-muted/70 opacity-60" : "hover:scale-[1.02] hover:shadow-2xl"
        )}>
          {!tool.disabled && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>}
          <div className="relative z-10 flex flex-col items-center">
            <div className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300",
              !tool.disabled && "group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
            )}>
              <tool.icon className="h-8 w-8" />
            </div>
            <CardTitle className="font-headline text-2xl">{tool.title}</CardTitle>
            <CardDescription className="mt-2 text-base text-muted-foreground">
              {tool.description}
            </CardDescription>
          </div>
        </Card>
      </CardWrapper>
    </motion.div>
  );
}


function DashboardHub() {
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
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <h2 className="text-3xl font-bold font-headline mb-8 text-center">Available Tools</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </motion.div>
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
