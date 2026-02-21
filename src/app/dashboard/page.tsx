'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Calculator, BrainCircuit, Briefcase, Monitor, Repeat, 
  DatabaseZap, Paintbrush, FlaskConical, Landmark, LayoutDashboard, 
  ArrowUpRight, LucideIcon, TrendingUp, Link2, Network, Map, ClipboardList, Target, DollarSign
} from "lucide-react";

import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "@/components/user-nav";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { cn } from "@/lib/utils";

// 1. 타입 정의로 데이터 구조 명확화
interface ToolItem {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled: boolean;
  badge?: string; // 배지 텍스트 옵션 추가
}

const tools: ToolItem[] = [
  {
    id: "data-studio",
    href: "/dashboard/data-studio/integrations",
    icon: Link2,
    title: "Integrations / Data Sources",
    description: "Connect to external data sources: SNS, Ads API, CRM, and Databases. Automate collection with scheduling.",
    disabled: false,
    badge: "New"
  },
  {
    id: "analyze",
    href: "/dashboard/statistica",
    icon: Calculator,
    title: "Standard Analytics",
    description: "Execute fundamental statistical tests to identify patterns.",
    disabled: false,
    badge: "Beta"
  },
  {
    id: "decide",
    href: "/dashboard/scenario",
    icon: Briefcase,
    title: "Strategic Decision",
    description: "Solve complex business problems with domain-specific optimization.",
    disabled: false,
    badge: "Beta"
  },
  {
    id: "finance",
    href: "/dashboard/financial-modeling",
    icon: Landmark,
    title: "Financial Modeling",
    description: "Optimize portfolios and manage financial risks with professional models.",
    disabled: false,
    badge: "Beta"
  },
  {
    id: "survey",
    href: "/dashboard/survey2",
    icon: ClipboardList,
    title: "Survey Tool",
    description: "Create surveys and transform responses into statistical and decision-ready analyses.",
    disabled: false,
    badge: "Beta"
  },
  
  {
    id: "visualize",
    href: "/dashboard/visualization",
    icon: Paintbrush,
    title: "Visual Communication",
    description: "Transform complex analytical results into clear visual narratives.",
    disabled: true,
    badge: "Coming Soon"
  },
  {
    id: "evaluation",
    href: "/dashboard/evaluation", 
    icon: Repeat,
    title: "Integrated Assessment",
    description: "Synthesize multi-dimensional data to evaluate overall performance.",
    disabled: true,
    badge: "Coming Soon"
    
  },
  {
    id: "geospatial",
    href: "/dashboard/map-analysis",
    icon: Map,
    title: "Geospatial Analysis",
    description: "Visualize location data and perform spatial analysis through interactive maps.",
    disabled: false,
    badge: "New"
  },
  {
    id: "finance-analytics",
    href: "/dashboard/finance-analytics",
    icon: TrendingUp,
    title: "Finance Analytics",
    description: "Market data analysis, technical indicators, and stock screening based on live financial data.",
    disabled: false,
    badge: "New"
  },
  {
    id: "sem",
    href: "/dashboard/sem",
    icon: Network,
    title: "Structural Equation Modeling",
    description: "Build and estimate SEM models by uploading path diagram images.",
    disabled: true,
    badge: "Coming Soon"
  },
  {
    id: "optimization",
    href: "/dashboard/optimization",
    icon: Target,
    title: "Decision Analytics",
    description: "Optimize decisions with linear, goal, and transportation programming.",
    disabled: true,
    badge: "Coming Soon"
  },
  {
    id: "derivatives",
    href: "/dashboard/derivatives",
    icon: DollarSign,
    title: "Derivatives Analysis",
    description: "Tools for options pricing, greeks, and derivatives modeling.",
    disabled: true,
    badge: "Comming Soon"

  },
  {
    id: "monitor",
    href: "/dashboard/dashboards",
    icon: Monitor,
    title: "Continuous Monitoring",
    description: "Establish real-time dashboards to track key metrics.",
    disabled: true,
    badge: "Coming Soon"
  },
  // Future Tools
  {
    id: "predict",
    href: "/dashboard/machine-learning",
    icon: BrainCircuit,
    title: "Predictive Modeling",
    description: "Leverage machine learning to forecast future trends.",
    disabled: true,
    badge: "Coming Soon"
  },
];

// 배지 컴포넌트
const StatusBadge = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <span className="absolute top-4 right-4 z-20 inline-flex items-center rounded-full border border-muted-foreground/20 bg-muted/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
      {text}
    </span>
  );
};

function ToolCard({ tool }: { tool: ToolItem }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // 2. 래퍼 컴포넌트 개선: Disabled 처리 및 접근성 강화
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tool.disabled) {
      // pointer-events-none으로 클릭 원천 차단
      return <div className="h-full cursor-not-allowed opacity-60 grayscale-[0.3]">{children}</div>;
    }
    return (
      <Link 
        href={tool.href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block h-full outline-none"
        aria-label={`${tool.title} - Opens in new tab`} // 스크린 리더용 라벨
      >
        {children}
      </Link>
    );
  };

  return (
    <motion.div 
      variants={cardVariants} 
      className="h-full"
      whileTap={!tool.disabled ? { scale: 0.98 } : undefined} // 3. 클릭 시 살짝 눌리는 느낌 추가
    >
      <CardWrapper>
        <Card className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl border-border bg-card p-6 shadow-sm transition-all duration-300",
          !tool.disabled && "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/50"
        )}>
          {/* Primary Gradient Hover Effect */}
          {!tool.disabled && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}

          <StatusBadge text={tool.badge} />

          <div className="relative z-10 flex flex-1 flex-col items-start text-left">
            {/* Icon Box */}
            <div className={cn(
              "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300",
              tool.disabled 
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"
            )}>
              <tool.icon className="h-7 w-7" />
            </div>

            {/* Title Area */}
            <div className="flex w-full items-center justify-between">
              <CardTitle className="mb-2 text-xl font-bold tracking-tight text-foreground">
                {tool.title}
              </CardTitle>
              {/* 4. 새 탭 아이콘 힌트 (우측 상단 화살표) */}
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

function DashboardHub() {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Workspace</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-sm text-right sm:block">
            <p className="font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Analytics Team</p>
          </div>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <div className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Analytics Tools
              </h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Select a tool to open in a new workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </motion.div>
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