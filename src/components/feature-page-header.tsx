'use client';

import { Button } from '@/components/ui/button';
import { Calculator, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FeaturePageHeaderProps {
  title: string;
}

export function FeaturePageHeader({ title }: FeaturePageHeaderProps) {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full max-w-6xl mx-auto flex items-center">
        <div className="flex-1 flex justify-start">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <div className="flex-1 flex justify-center">
          <Link href="/" className="flex items-center justify-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-headline font-bold">{title}</h1>
          </Link>
        </div>
        <div className="flex-1" />
      </div>
    </header>
  );
}
