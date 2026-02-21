'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, Workflow, Table2, ArrowUpRight,
  LucideIcon, LayoutDashboard, ArrowLeft, Database,
} from "lucide-react";

import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudioTool {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled: boolean;
  badge?: string;
  color: {
    bg: string;
    icon: string;
    hover: string;
    gradient: string;
  };
  stats?: string;
}

// ─── Tool Data ───────────────────────────────────────────────────────────────

const studioTools: StudioTool[] = [
  {
    id: "integration",
    href: "/dashboard/data-studio/integrations",
    icon: Link2,
    title: "Data Integration",
    description: "Manage API connections and data sources. Connect and monitor REST APIs, databases, file storage, and more.",
    disabled: false,
    badge: "Beta",
    color: {
      bg: "bg-blue-500/10",
      icon: "text-blue-600 dark:text-blue-400",
      hover: "hover:border-blue-500/50 hover:shadow-blue-500/5 hover:ring-blue-500/50",
      gradient: "from-blue-500/5 via-transparent to-transparent",
    },
    stats: "Data Sources",
  },
  {
    id: "pipeline",
    href: "/dashboard/data-studio/pipeline",
    icon: Workflow,
    title: "Data Pipeline",
    description: "Build automated data processing pipelines. Chain steps from collection to cleaning, transformation, and feature engineering for automatic execution.",
    disabled: false,
    badge: "Beta",
    color: {
      bg: "bg-violet-500/10",
      icon: "text-violet-600 dark:text-violet-400",
      hover: "hover:border-violet-500/50 hover:shadow-violet-500/5 hover:ring-violet-500/50",
      gradient: "from-violet-500/5 via-transparent to-transparent",
    },
    stats: "Pipelines",
  },
  {
    id: "editor",
    href: "/dashboard/data-studio/data-preprocessing",
    icon: Table2,
    title: "Data Editor",
    description: "Browse and edit data directly. Perform manual preprocessing tasks including missing value handling, sorting, filtering, transformation, and encoding.",
    disabled: false,
    badge: "Beta",
    color: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-600 dark:text-emerald-400",
      hover: "hover:border-emerald-500/50 hover:shadow-emerald-500/5 hover:ring-emerald-500/50",
      gradient: "from-emerald-500/5 via-transparent to-transparent",
    },
    stats: "Manual Tool",
  },
];

// ─── Badge Component ─────────────────────────────────────────────────────────

const StatusBadge = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <span className="absolute top-4 right-4 z-20 inline-flex items-center rounded-full border border-muted-foreground/20 bg-muted/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
      {text}
    </span>
  );
};



// ─── Tool Card ───────────────────────────────────────────────────────────────

function StudioToolCard({ tool, index }: { tool: StudioTool; index: number }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: index * 0.1, duration: 0.4, ease: "easeOut" as const }
    },
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tool.disabled) {
      return <div className="h-full cursor-not-allowed opacity-60 grayscale-[0.3]">{children}</div>;
    }
    return (
      <Link
        href={tool.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full outline-none"
        aria-label={`${tool.title} - Opens in new tab`}
      >
        {children}
      </Link>
    );
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full"
      whileTap={!tool.disabled ? { scale: 0.98 } : undefined}
    >
      <CardWrapper>
        <Card className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl border-border bg-card p-6 shadow-sm transition-all duration-300",
          !tool.disabled && [tool.color.hover, "hover:shadow-lg hover:ring-1"]
        )}>
          {/* Gradient Hover */}
          {!tool.disabled && (
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
              tool.color.gradient
            )} />
          )}

          <StatusBadge text={tool.badge} />

          <div className="relative z-10 flex flex-1 flex-col items-start text-left">
            {/* Icon */}
            <div className={cn(
              "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300",
              tool.disabled
                ? "border-border bg-muted text-muted-foreground"
                : cn("border-current/20", tool.color.bg, tool.color.icon, "group-hover:scale-110")
            )}>
              <tool.icon className="h-7 w-7" />
            </div>

            {/* Title */}
            <div className="flex w-full items-center justify-between">
              <CardTitle className="mb-2 text-xl font-bold tracking-tight text-foreground">
                {tool.title}
              </CardTitle>
              {!tool.disabled && (
                <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
              )}
            </div>

            {/* Description */}
            <CardDescription className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.description}
            </CardDescription>

            {/* Stats tag */}
            {tool.stats && (
              <div className={cn(
                "mt-4 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
                tool.color.bg, tool.color.icon
              )}>
                {tool.stats}
              </div>
            )}
          </div>
        </Card>
      </CardWrapper>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function DataStudioHub() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Data Studio</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-sm text-right sm:block">
            <p className="font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Data Studio</p>
          </div>
          <UserNav />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Data Studio
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Tools for managing data connections, automated processing, and manual editing.
            </p>
          </motion.div>

          {/* Tool Cards */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {studioTools.map((tool, index) => (
              <StudioToolCard key={tool.id} tool={tool} index={index} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function DataStudioPage() {
  return (
    <DashboardClientLayout>
      <DataStudioHub />
    </DashboardClientLayout>
  );
}