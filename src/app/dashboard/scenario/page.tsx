
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Factory, LineChart, Landmark, ArrowRight, LayoutDashboard, Calculator, ArrowLeft, Building, Scale, Truck, ShoppingCart } from "lucide-react";
import Link from "next/link";
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { Button } from "@/components/ui/button";

const scenarioOptions = [
  {
    id: "policy",
    href: "/dashboard/scenario/policy",
    icon: Building,
    title: "Policy Simulation",
    description: "Model the impact of policy changes on various outcomes.",
    disabled: true,
  },
  {
    id: "quality",
    href: "/dashboard/scenario/quality",
    icon: Scale,
    title: "Quality Control",
    description: "Simulate changes in manufacturing processes to predict quality improvements.",
    disabled: true,
  },
  {
    id: "marketing",
    href: "/dashboard/scenario/marketing",
    icon: ShoppingCart,
    title: "Marketing Mix",
    description: "Analyze the impact of different marketing spend allocations on ROI.",
    disabled: true,
  },
  {
    id: "logistics",
    href: "/dashboard/scenario/logistics",
    icon: Truck,
    title: "Logistics Optimization",
    description: "Simulate supply chain adjustments to optimize for cost and time.",
    disabled: true,
  },
];

function ScenarioCard({ option }: { option: typeof scenarioOptions[0] }) {
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
              {option.disabled ? "Coming Soon" : <>Start Scenario <ArrowRight className="ml-2 h-4 w-4" /></>}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

function ScenarioHub() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Workspace
                </Link>
            </Button>
        </div>
        <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center justify-center gap-2">
                <FlaskConical className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Scenario Analysis</h1>
            </Link>
        </div>
        <div className="w-[180px]"/>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold font-headline mb-8 text-center text-foreground">Select a Scenario Type</h2>
          <div className="grid grid-cols-1 gap-6">
            {scenarioOptions.map((option) => (
              <ScenarioCard key={option.id} option={option} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ScenarioPage() {
  return (
    <DashboardClientLayout>
      <ScenarioHub />
    </DashboardClientLayout>
  );
}
