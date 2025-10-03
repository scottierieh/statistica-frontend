
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function DeprecatedSurveyPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="font-headline">Page Deprecated</CardTitle>
          <CardDescription>
            This survey tool is outdated. Please use the new and improved survey dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/survey2">
              Go to New Survey Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
