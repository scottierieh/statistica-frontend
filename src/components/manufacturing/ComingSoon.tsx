'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Clock } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-500 mt-1">{description}</p>
            </div>
            
            <Card>
                <CardContent className="py-16">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Construction className="h-10 w-10 text-gray-400" />
                        </div>
                        <Badge variant="secondary" className="mb-4">
                            <Clock className="h-3 w-3 mr-1" />
                            Coming Soon
                        </Badge>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {title} is Under Development
                        </h3>
                        <p className="text-gray-500 max-w-md">
                            This feature is currently being developed and will be available in a future update. 
                            Stay tuned for more powerful analytics capabilities!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}