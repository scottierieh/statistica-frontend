'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FastForward } from "lucide-react";

export default function SimulationApp() {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full mb-4">
                        <FastForward className="h-10 w-10 text-secondary-foreground" />
                    </div>
                    <CardTitle className="font-headline">Simulation Tool</CardTitle>
                    <CardDescription>
                        This tool is currently under construction. Advanced system modeling and simulation features will be available here soon.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
