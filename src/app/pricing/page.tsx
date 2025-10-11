
import PricingSection from '@/components/pricing-section';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full max-w-6xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start items-center gap-4">
                <Button variant="outline" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link></Button>
            </div>
             <Link href="/" className="flex items-center justify-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Skarii</h1>
            </Link>
            <div className="flex-1 flex justify-end items-center gap-4">
                {/* This div is to balance the flex layout */}
            </div>
        </div>
      </header>
      <main className="flex-1">
        <PricingSection />
      </main>
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 Skarii. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Terms of Service</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
