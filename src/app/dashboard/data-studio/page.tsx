'use client';

import Link from "next/link";
import { motion } from "framer-motion";
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
        href: "/dashboard/data-studio/integrations",
        icon: Link2,
        title: "Data Integration",
        description:
          "Manage API connections and data sources. Connect and monitor REST APIs, databases, file storage, and more.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "pipeline",
        href: "/dashboard/data-studio/pipeline",
        icon: Workflow,
        title: "Data Pipeline",
        description:
          "Build automated data processing pipelines. Chain steps from collection to cleaning, transformation, and feature engineering.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "editor",
        href: "/dashboard/data-studio/data-preprocessing",
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
        title: "Standard Analytics",
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
        id: "finance",
        href: "/dashboard/financial-modeling",
        icon: Landmark,
        title: "Financial Modeling",
        description:
          "Optimize portfolios and manage financial risks with professional models.",
        disabled: false,
        badge: "Beta",
      },
      {
        id: "finance-analytics",
        href: "/dashboard/finance-analytics",
        icon: TrendingUp,
        title: "Finance Analysis",
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

// ─── Components ───────────────────────────────────────────────────────────────

const StatusBadge = ({ text }: { text?: string }) => {
  if (!text) return null;

  const colorMap: Record<string, string> = {
    New: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    Beta: "bg-blue-50 text-blue-600 ring-blue-200",
    "Coming Soon": "bg-neutral-100 text-neutral-500 ring-neutral-200",
    "Comming Soon": "bg-neutral-100 text-neutral-500 ring-neutral-200",
  };

  const colors = colorMap[text] ?? "bg-neutral-100 text-neutral-500 ring-neutral-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        colors
      )}
    >
      {text}
    </span>
  );
};

function ToolCard({ tool }: { tool: ToolItem }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tool.disabled) {
      return (
        <div className="pointer-events-none opacity-50 cursor-not-allowed">
          {children}
        </div>
      );
    }
    return (
      <Link href={tool.href} target="_blank" rel="noopener noreferrer">
        {children}
      </Link>
    );
  };

  return (
    <motion.div variants={cardVariants}>
      <CardWrapper>
        <Card
          className={cn(
            "group relative overflow-hidden border border-neutral-200 bg-white",
            "p-5 transition-all duration-300",
            !tool.disabled &&
              "hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-200/60"
          )}
        >
          {/* Gradient hover effect */}
          {!tool.disabled && (
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-transparent to-purple-50/40" />
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-3">
            {/* Icon */}
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                "bg-neutral-100 text-neutral-500",
                !tool.disabled &&
                  "group-hover:bg-neutral-200/80 group-hover:text-neutral-700"
              )}
            >
              <tool.icon className="h-5 w-5" />
            </div>

            {/* Title + Badge + Arrow */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-neutral-800">
                  {tool.title}
                </CardTitle>
                <StatusBadge text={tool.badge} />
              </div>
              {!tool.disabled && (
                <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-all duration-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </div>

            {/* Description */}
            <CardDescription className="text-xs leading-relaxed text-neutral-500">
              {tool.description}
            </CardDescription>
          </div>
        </Card>
      </CardWrapper>
    </motion.div>
  );
}

function CategorySection({ category }: { category: ToolCategory }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.section
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
          <category.icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 tracking-wide">
            {category.label}
          </h2>
          <p className="text-xs text-neutral-400">{category.description}</p>
        </div>
      </div>

      {/* Tool Grid */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {category.tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </motion.div>
    </motion.section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DashboardHub() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">
              Workspace
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-neutral-600">
                {user?.name}
              </p>
              <p className="text-[10px] text-neutral-400">Analytics Team</p>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <div className="mb-10">
          <h1 className="text-xl font-bold text-neutral-800 tracking-tight">
            Analytics Tools
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Select a tool to open in a new workspace.
          </p>
        </div>

        <div className="space-y-10">
          {categories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
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