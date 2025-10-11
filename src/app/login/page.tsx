
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Calculator, Chrome } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');

    const handleLogin = () => {
        login({ email, name: email.split('@')[0] || 'User' });
        router.push('/dashboard');
    };

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
                            <h1 className="text-xl font-headline font-bold">Skarii</h1>
                        </Link>
                    </div>
                    <div className="flex-1" />
                </div>
            </header>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                     <Button className="w-full" onClick={handleLogin}>Login</Button>
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
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
