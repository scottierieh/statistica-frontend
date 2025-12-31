'use client';

import GuidePage from '@/components/pages/guide-page';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AnalysisListPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
        <div className="flex items-center gap-2">
           <Button variant="outline" asChild>
                <Link href="/faq">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Help Center
                </Link>
            </Button>
        </div>
         <div className="flex-1 flex justify-center">
             <Link href="/" className="flex items-center justify-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Analysis Methods</h1>
            </Link>
        </div>
        <div className="w-[210px]"/>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <GuidePage />
        </div>
      </main>
    </div>
  );
}
