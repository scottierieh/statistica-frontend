
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Factory, LineChart, Landmark, ArrowRight, LayoutDashboard, Calculator, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { Button } from "@/components/ui/button";

const dashboardOptions = [
  {
    id: "manufacturing",
    href: "/dashboard/manufacturing",
    icon: Factory,
    title: "Manufacturing Dashboard",
    description: "Monitor production lines, track OEE, and analyze defect rates with statistical process control.",
  },
  {
    id: "finance",
    href: "/dashboard/finance",
    icon: Landmark,  // 
    title: "Finance Dashboard",
    description: "Portfolio analysis, risk management, trading analytics, and financial modeling tools.",
  },
  {
    id: "marketing",
    href: "/dashboard/marketing-analysis",
    icon: LineChart,
    title: "Marketing Dashboard",
    description: "Analyze campaign ROI, track conversion funnels, and understand customer acquisition channels.",
    disabled: true,
  },
];

function DashboardCard({ option }: { option: typeof dashboardOptions[0] }) {
  const CardWrapper = ({ children }: { children: React.ReactNode }) =>
    option.disabled ? (
      <div className="h-full">{children}</div>
    ) : (
      <Link href={option.href} className="block h-full">
        {children}
      </Link>
    );

  return (
    <CardWrapper>
      <Card className="group h-full flex flex-col hover:border-primary transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-lg">
              <option.icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1" />
        <CardContent>
          <div className="flex justify-end">
            <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

function DashboardsHub() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tools
                </Link>
            </Button>
        </div>
        <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center justify-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Dashboards</h1>
            </Link>
        </div>
        <div className="w-[180px]"/>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold font-headline mb-8 text-center text-foreground">Select a Dashboard</h2>
          <div className="grid grid-cols-1 gap-6">
            {dashboardOptions.map((option) => (
              <DashboardCard key={option.id} option={option} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardsHubPage() {
    return (
        <DashboardClientLayout>
            <DashboardsHub />
        </DashboardClientLayout>
    )
}
