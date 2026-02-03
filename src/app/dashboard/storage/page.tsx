export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CloudOff } from 'lucide-react';

export default function StoragePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Firebase Image Uploader</CardTitle>
          <CardDescription>Upload images to Firebase Storage and see them displayed below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CloudOff className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Storage Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Image upload functionality is being configured. Please check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}