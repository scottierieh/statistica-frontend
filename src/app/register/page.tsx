
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calculator, Chrome } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { PolicyDialog } from '@/components/policy-dialog';

export default function RegisterPage() {
    const [agreed, setAgreed] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40">
             <header className="fixed top-0 left-0 right-0 px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm z-50">
                <div className="w-full max-w-6xl mx-auto flex items-center">
                    <div className="flex-1 flex justify-start">
                        <Button variant="outline" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link></Button>
                    </div>
                    <div className="flex-1 flex justify-center">
                         <Link href="/" className="flex items-center justify-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">skari</h1>
                        </Link>
                    </div>
                    <div className="flex-1" />
                </div>
            </header>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Enter your information to get started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="Your Name" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required />
                    </div>
                    <div className="flex items-start space-x-3 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-0.5" />
                        <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            I agree to the{' '}
                            <PolicyDialog triggerText="Terms of Service" title="Terms of Service" />
                            {' '}and{' '}
                            <PolicyDialog triggerText="Privacy Policy" title="Privacy Policy" />
                            .
                        </label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                     <Button className="w-full" disabled={!agreed}>Create Account</Button>
                     <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            OR
                            </span>
                        </div>
                    </div>
                     <Button variant="outline" className="w-full">
                        <Chrome className="mr-2 h-4 w-4" />
                        Continue with Google
                    </Button>
                     <div className="text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="underline">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
