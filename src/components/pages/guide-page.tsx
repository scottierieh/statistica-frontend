'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function GuidePage() {
    return (
        <div className="flex flex-1 items-center justify-center h-full p-4 md:p-6">
            <Card className="w-full max-w-3xl text-center shadow-lg">
                <CardHeader className="p-8">
                    <div className="flex justify-center items-center mb-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <BookOpen className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Statistica Guide</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mt-2">
                        Welcome! This guide will help you get the most out of Statistica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <p className="text-muted-foreground">
                        Content is coming soon. This page will contain tutorials, examples, and best practices for using the various statistical tools available.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
