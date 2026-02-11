'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Globe, Ruler, Map as MapIcon } from 'lucide-react';

export default function GeospatialAnalysisPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Geospatial Operations
          </CardTitle>
          <CardDescription>
            Perform advanced spatial queries and geometric operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-muted/5 border-none shadow-none p-4">
              <div className="flex items-center gap-3 mb-2">
                <Ruler className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Distance Matrix</h4>
              </div>
              <p className="text-sm text-muted-foreground">Calculate distances between multiple points automatically.</p>
            </Card>
            <Card className="bg-muted/5 border-none shadow-none p-4">
              <div className="flex items-center gap-3 mb-2">
                <MapIcon className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Buffer Analysis</h4>
              </div>
              <p className="text-sm text-muted-foreground">Create proximity zones around specific locations.</p>
            </Card>
          </div>
          <div className="h-64 mt-6 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 gap-4">
            <p className="text-muted-foreground">Spatial computation tools coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
