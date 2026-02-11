'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Map, MapPin, Activity, Globe, Info, Sparkles, MousePointer2 } from 'lucide-react';

export default function MapGuidePage() {
  const features = [
    {
      icon: MapPin,
      title: "Point Visualization",
      desc: "Plot individual locations using latitude and longitude coordinates."
    },
    {
      icon: Activity,
      title: "Heatmap Analysis",
      desc: "Visualize the density of data points to identify hotspots."
    },
    {
      icon: Globe,
      title: "Choropleth Maps",
      desc: "Color regions based on statistical values for thematic mapping."
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Map className="w-8 h-8 text-primary" />
            Geospatial Analysis Guide
          </CardTitle>
          <CardDescription className="text-lg">
            Visualize your data geographically and discover spatial patterns.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <Card key={i} className="border-2 border-primary/5 hover:border-primary/20 transition-all">
            <CardHeader>
              <f.icon className="w-10 h-10 text-primary mb-2" />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <p className="font-semibold">Upload Location Data</p>
              <p className="text-sm text-muted-foreground">Upload a CSV or Excel file containing columns for Latitude, Longitude, or Address.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <p className="font-semibold">Select Visualization Type</p>
              <p className="text-sm text-muted-foreground">Choose from Marker maps, Heatmaps, or Choropleths from the sidebar.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <p className="font-semibold">Explore and Analyze</p>
              <p className="text-sm text-muted-foreground">Use the interactive map to zoom, filter, and perform spatial operations.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
        <Info className="w-5 h-5 text-primary shrink-0" />
        <p>Tip: Map analysis works best with clean coordinate data. If you only have addresses, use the Data Preparation tool to geocode your dataset first.</p>
      </div>
    </div>
  );
}
