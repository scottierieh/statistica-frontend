import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SurveyFeaturePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Survey" />
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <Card>
          <CardHeader>
            <CardTitle>About Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the page for the Survey feature. Content will be added here.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
