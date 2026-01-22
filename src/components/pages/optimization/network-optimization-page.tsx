'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideIcon, Share2 } from 'lucide-react';

const PlaceholderPage = ({ title, description, icon: Icon }: { title: string, description: string, icon: LucideIcon }) => (
    <div className="flex flex-1 items-center justify-center h-full p-4">
        <Card className="w-full max-w-2xl text-center">
            <CardHeader>
                <div className="flex justify-center items-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        {Icon && <Icon className="w-8 h-8 text-primary" />}
                    </div>
                </div>
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Stay tuned for updates.</p>
            </CardContent>
        </Card>
    </div>
);

export default function NetworkOptimizationPage() {
    return (
        <PlaceholderPage 
            title="Network Optimization"
            description="This section is under construction. Tools for network flow and path optimization are coming soon!"
            icon={Share2}
        />
    );
}
