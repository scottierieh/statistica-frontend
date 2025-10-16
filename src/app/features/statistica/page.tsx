import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatisticaFeaturePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Statistica" />
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <Card>
          <CardHeader>
            <CardTitle>About Statistica</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the page for the Statistica feature. Content will be added here.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
