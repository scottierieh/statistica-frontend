'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Variable,
  Settings2,
  ShieldCheck,
  Info,
} from 'lucide-react';

export default function RunningAnalysisPage() {
  return (
    <Card>
      <CardContent className="p-8">
        <article className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold mb-4">Running an Analysis</h1>
          <p className="text-lg text-muted-foreground mb-8">A step-by-step guide to executing analyses.</p>

          <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Info className="w-7 h-7 text-primary" />
              What is Running Analysis?
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="step-variables" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Variable className="w-7 h-7 text-primary" />
              Step 1: Variables
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="step-settings" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Settings2 className="w-7 h-7 text-primary" />
              Step 2: Settings
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="step-validation" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-primary" />
              Step 3: Validation
            </h2>
            <p>Content for this section goes here.</p>
          </section>

        </article>
      </CardContent>
    </Card>
  );
}
