'use client';

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, BrainCircuit, Briefcase, Monitor, Repeat,
  Paintbrush, Landmark, LayoutDashboard, ArrowUpRight,
  LucideIcon, TrendingUp, Link2, Network, Map, ClipboardList, Target,
  DollarSign, Database, BarChart3, FileQuestion, Workflow, Table2
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolItem {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled: boolean;
  badge?: string;
}

interface ToolCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  tools: ToolItem[];
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const categories: ToolCategory[] = [
  {
    id: "data-studio",
    label: "Data Studio",
    icon: Database,
    description: "Connect, transform, and manage your data pipelines.",
    tools: [
      {
        id: "integration",
        href: "/dashboard/integrations",
        icon: Link2,
        title: "Data Integration",
        description:
          "Manage API connections and data sources. Connect and monitor REST APIs, databases, file storage, and more.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "pipeline",
        href: "/dashboard/pipeline",
        icon: Workflow,
        title: "Data Pipeline",
        description:
          "Build automated data processing pipelines. Chain steps from collection to cleaning, transformation, and feature engineering.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "editor",
        href: "/dashboard/data-preprocessing",
        icon: Table2,
        title: "Data Editor",
        description:
          "Browse and edit data directly. Perform manual preprocessing including missing value handling, sorting, filtering, and encoding.",
        disabled: false,
        badge: "Beta",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Statistical analysis, modeling, and decision optimization.",
    tools: [
      {
        id: "analyze",
        href: "/dashboard/statistica",
        icon: Calculator,
        title: "Statistical Analysis",
        description:
          "Execute fundamental statistical tests to identify patterns.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "decide",
        href: "/dashboard/scenario",
        icon: Briefcase,
        title: "Strategic Decision",
        description:
          "Solve complex business problems with domain-specific optimization.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "finance-analytics",
        href: "/dashboard/finance-analytics",
        icon: Landmark,
        title: "Financial Analysis",
        description:
          "Market data analysis, technical indicators, and stock screening based on live financial data.",
        disabled: false,
        badge: "New",
      },
      {
        id: "geospatial",
        href: "/dashboard/map-analysis",
        icon: Map,
        title: "Geospatial Analysis",
        description:
          "Visualize location data and perform spatial analysis through interactive maps.",
        disabled: false,
        badge: "New",
      },
      {
        id: "visualize",
        href: "/dashboard/visualization",
        icon: Paintbrush,
        title: "Visual Communication",
        description:
          "Transform complex analytical results into clear visual narratives.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "sem",
        href: "/dashboard/sem",
        icon: Network,
        title: "Structural Equation Modeling",
        description:
          "Build and estimate SEM models by uploading path diagram images.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "optimization",
        href: "/dashboard/optimization",
        icon: Target,
        title: "Decision Analytics",
        description:
          "Optimize decisions with linear, goal, and transportation programming.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "derivatives",
        href: "/dashboard/derivatives",
        icon: DollarSign,
        title: "Derivatives Analysis",
        description:
          "Tools for options pricing, greeks, and derivatives modeling.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "evaluation",
        href: "/dashboard/evaluation",
        icon: Repeat,
        title: "Integrated Assessment",
        description:
          "Synthesize multi-dimensional data to evaluate overall performance.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "monitor",
        href: "/dashboard/dashboards",
        icon: Monitor,
        title: "Continuous Monitoring",
        description:
          "Establish real-time dashboards to track key metrics.",
        disabled: true,
        badge: "Coming Soon",
      },
      {
        id: "predict",
        href: "/dashboard/machine-learning",
        icon: BrainCircuit,
        title: "Predictive Modeling",
        description:
          "Leverage machine learning to forecast future trends.",
        disabled: true,
        badge: "Coming Soon",
      },
    ],
  },
  {
    id: "survey",
    label: "Survey",
    icon: FileQuestion,
    description: "Design surveys and analyze response data.",
    tools: [
      {
        id: "survey",
        href: "/dashboard/survey2",
        icon: ClipboardList,
        title: "Survey Tool",
        description:
          "Create surveys and transform responses into statistical and decision-ready analyses.",
        disabled: false,
        badge: "Beta",
      },
    ],
  },
];

// ─── Badge Component ──────────────────────────────────────────────────────────

const StatusBadge = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <span className="absolute top-4 right-4 z-20 inline-flex items-center rounded-full border border-muted-foreground/20 bg-muted/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
      {text}
    </span>
  );
};

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolItem }) {
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tool.disabled) {
      return (
        <div className="pointer-events-none opacity-60 cursor-not-allowed grayscale-[0.3]">
          {children}
        </div>
      );
    }
    return (
      <Link href={tool.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {children}
      </Link>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <CardWrapper>
        <Card
          className={cn(
            "group relative flex h-full flex-col overflow-hidden border border-border bg-card",
            "p-6 transition-all duration-300",
            !tool.disabled && "hover:border-border/80 hover:shadow-lg hover:ring-1 hover:ring-border/50"
          )}
        >
          {!tool.disabled && (
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02]" />
            </div>
          )}

          <StatusBadge text={tool.badge} />

          <div className="relative z-10 flex flex-1 flex-col items-start text-left">
            <div
              className={cn(
                "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300",
                tool.disabled
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-primary/20 bg-primary/10 text-primary group-hover:scale-110"
              )}
            >
              <tool.icon className="h-7 w-7" />
            </div>

            <div className="flex w-full items-center justify-between">
              <CardTitle className="mb-2 text-xl font-bold tracking-tight text-foreground">
                {tool.title}
              </CardTitle>
              {!tool.disabled && (
                <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
              )}
            </div>

            <CardDescription className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.description}
            </CardDescription>
          </div>
        </Card>
      </CardWrapper>
    </motion.div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function CategoryTabs({
  categories,
  activeId,
  onChange,
}: {
  categories: ToolCategory[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <Icon className="h-4 w-4" />
            {cat.label}
            <span className="ml-1 text-xs text-muted-foreground/60">
              {cat.tools.length}
            </span>
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DashboardHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("analytics");

  const activeCategory = categories.find((c) => c.id === activeTab)!;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">Workspace</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Analytics Team</p>
          </div>
          <UserNav />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Analytics Tools
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Select a tool to open in a new workspace.
            </p>
          </motion.div>

          {/* Tabs */}
          <CategoryTabs
            categories={categories}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Description */}
          <p className="mt-4 mb-6 text-sm text-muted-foreground">
            {activeCategory.description}
          </p>

          {/* Cards Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {activeCategory.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </motion.div>
          </AnimatePresence>
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
  );
}