
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
    title: "통계 분석",
    description: "40가지 이상의 통계 분석 기법을 사용하여 데이터를 분석하고 AI 기반 리포트를 생성합니다.",
  },
  {
    id: "data-preprocessing",
    href: "/dashboard/data-preprocessing",
    icon: DatabaseZap,
    title: "데이터 전처리",
    description: "결측치 처리, 변수 변환, 이상치 탐지 등 데이터 분석을 위한 준비 작업을 수행합니다.",
  },
  {
    id: "visualization",
    href: "/dashboard/visualization",
    icon: Paintbrush,
    title: "시각화",
    description: "다양한 차트와 그래프를 통해 데이터를 시각적으로 탐색하고 인사이트를 발견합니다.",
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
          분석 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
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
          <h2 className="text-3xl font-bold font-headline mb-8 text-center text-foreground">분석 유형 선택</h2>
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
