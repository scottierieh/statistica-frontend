
'use client';

import GaborGrangerPage from '@/components/pages/gabor-granger-page';
import StatisticaApp from '@/components/statistica-app';

export default function GaborGrangerAnalysisPage() {
  return (
    <StatisticaApp>
      {({ data, numericHeaders, categoricalHeaders, onLoadExample }: any) => (
        <GaborGrangerPage
          data={data}
          numericHeaders={numericHeaders}
          onLoadExample={onLoadExample}
        />
      )}
    </StatisticaApp>
  );
}
