
'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function DeepLearningApp() {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full mb-4">
                        <BrainCircuit className="h-10 w-10 text-secondary-foreground" />
                    </div>
                    <CardTitle className="font-headline">Deep Learning Tool</CardTitle>
                    <CardDescription>
                        This tool is currently under construction. Advanced deep learning features for building and training models will be available here soon.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
