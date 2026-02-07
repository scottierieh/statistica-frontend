'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export default function MonteCarloSimulationPage() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            Monte Carlo Simulation
          </CardTitle>
          <CardDescription>
            Simulate a range of outcomes by running thousands of scenarios with random variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/10">
            <p className="text-muted-foreground">Probability distribution models coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
