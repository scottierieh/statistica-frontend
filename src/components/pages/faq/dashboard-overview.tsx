'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Database,
  Users,
  Settings,
  ArrowRight,
  FlaskConical,
  Paintbrush,
  Target,
  DollarSign,
  ClipboardList,
  BrainCircuit,
  Network,
  Monitor
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is-dashboard", label: "What is the Dashboard?", level: 2 },
  { id: "key-components", label: "Key Components", level: 2 },
  { id: "common-actions", label: "Common Actions", level: 2 },
];

const TOOLS = [
    { icon: FlaskConical, title: "Scenario", description: "Explore what-if scenarios and simulations." },
    { icon: Database, title: "DataPrep", description: "Clean, transform, and prepare your data." },
    { icon: Paintbrush, title: "Visualization", description: "Create insightful charts and graphs." },
    { icon: Monitor, title: "Dashboards", description: "Build and monitor custom business dashboards." },
    { icon: Users, title: "Team", description: "Invite and manage team members." },
    { icon: Target, title: "Decision Analytics", description: "Optimize decisions with programming models." },
    { icon: DollarSign, title: "Derivatives Analysis", description: "Tools for options pricing and risk." },
    { icon: Network, title: "SEM", description: "Model complex structural equations." },
    { icon: ClipboardList, title: "Survey Tool", description: "Coming soon..." },
    { icon: BrainCircuit, title: "Machine Learning", description: "Coming soon..." },
];


export default function DashboardOverview() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-lg text-muted-foreground">
            Navigating your central workspace
          </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
          <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
              "The Workspace Dashboard is your mission control center. From here, you can access all analysis tools, manage your datasets, and get an overview of your recent activity."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
              Your gateway to data-driven insights.
            </p>
          </blockquote>
        </div>

        {/* WHAT IS THE DASHBOARD */}
        <section id="what-is-dashboard" className="scroll-mt-24 mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <LayoutDashboard className="w-7 h-7 text-primary" />
            What is the Workspace Dashboard?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              The Dashboard is the first screen you see after logging in. It's designed to be your <strong className="text-foreground">central hub</strong> for all activities on the platform. From here, you can launch different analysis tools, manage your projects, and access account settings.
            </p>
            <p>
              Think of it as the main menu of a powerful software suite. Each tool is designed for a specific purpose, and the dashboard provides a unified entry point to all of them.
            </p>
          </div>
        </section>

        {/* KEY COMPONENTS */}
        <section id="key-components" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Key Components
          </h2>
          <div className="space-y-6">
            <p className="text-base text-muted-foreground leading-relaxed">
              Your dashboard provides access to a suite of powerful tools. Here’s a brief overview of what each one does:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOOLS.map((tool) => (
                <div key={tool.title} className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <tool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{tool.title}</h4>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMON ACTIONS */}
        <section id="common-actions" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <HelpCircle className="w-7 h-7 text-primary" />
                Common Actions
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Starting an Analysis</h4>
                        <p>Simply click on one of the tool cards (e.g., "Scenario," "DataPrep," "Optimization") to launch that specific workspace.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Managing Your Account</h4>
                        <p>Click on your user icon in the top-right corner to access your profile, settings, and billing information, or to log out.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Getting Help</h4>
                        <p>The "Support" or "Help Center" links in the main navigation or user menu will take you to this documentation.</p>
                    </div>
                </div>
            </div>
        </section>
      </article>
    </FaqArticleLayout>
  );
}
