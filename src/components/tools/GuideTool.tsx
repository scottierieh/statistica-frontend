// components/tools/GuideTool.tsx
// Guide & Help — explains all available tools and how to use them

'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  ChevronRight,
  Upload,
  Search,
  Filter,
  Circle,
  Clock,
  Route,
  Layers,
  Hexagon,
  Pentagon,
  Waypoints,
  Grid3x3,
  Scan,
  ShieldAlert,
  CircleDot,
  Trophy,
  Table2,
  Navigation,
  FileText,
  Timer,
  Locate,
  MoveRight,
  Camera,
  Flame,
  CircleDashed,
  Combine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string;
  steps: string[];
  tip?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Upload,
    badge: 'Start here',
    steps: [
      'Upload a CSV or Excel file with latitude & longitude columns.',
      'Or click "Try Sample Data (NYC)" to explore with demo data.',
      'You can also drag & drop files anywhere on the screen.',
      'Points will appear on the map automatically.',
    ],
    tip: 'Your file needs at least "latitude" and "longitude" columns. Other columns become available for analysis.',
  },
  {
    id: 'navigation',
    title: 'Menu Navigation',
    icon: Layers,
    steps: [
      'Tools are organized into 3 categories: Analysis, Visualization, Utility.',
      'Click a category button on the left to open the flyout menu.',
      'Select a tool from the grid to open its settings panel.',
      'Switching tools auto-clears previous analysis from the map.',
      'Data & Guide buttons are always visible at the bottom of the sidebar.',
    ],
    tip: 'Active tools show a count badge on the category button.',
  },
  // ─── ANALYSIS ───
  {
    id: 'filter',
    title: 'Filter',
    icon: Filter,
    badge: 'Analysis',
    steps: [
      'Add conditions to filter your data (e.g., revenue > 1000000).',
      'Supports numeric (>, <, =, range) and text (contains, equals) filters.',
      'Multiple filters can be combined (AND logic).',
      'Filtered data is used by all other tools.',
    ],
  },
  {
    id: 'radius',
    title: 'Radius Analysis',
    icon: Circle,
    badge: 'Analysis',
    steps: [
      'Set a center point (click map or enter coordinates).',
      'Adjust the radius to define your analysis area.',
      'View statistics for points inside the radius.',
      'Great for catchment area and proximity analysis.',
    ],
  },
  {
    id: 'voronoi',
    title: 'Voronoi Diagram',
    icon: Hexagon,
    badge: 'Analysis',
    steps: [
      'Add center points to create Voronoi cells.',
      'Each cell contains the area closest to its center.',
      'Points are automatically assigned to the nearest cell.',
      'Useful for territory planning and service area analysis.',
    ],
  },
  {
    id: 'hull',
    title: 'Convex Hull',
    icon: Pentagon,
    badge: 'Analysis',
    steps: [
      'Groups points by a categorical column.',
      'Draws a convex boundary around each group.',
      'Shows area (km²) and point count per group.',
    ],
  },
  {
    id: 'spider',
    title: 'Spider Map',
    icon: Waypoints,
    badge: 'Analysis',
    steps: [
      'Select a hub point (center).',
      'Lines connect the hub to all other points.',
      'Shows distance distribution and statistics.',
      'Great for hub-and-spoke logistics analysis.',
    ],
  },
  {
    id: 'dbscan',
    title: 'DBSCAN Clustering',
    icon: Scan,
    badge: 'Analysis',
    steps: [
      'Density-based clustering — finds groups automatically.',
      'Set ε (search radius) and minimum points per cluster.',
      'Use 💡 Auto-suggest for optimal ε value.',
      'Detects noise points that don\'t belong to any cluster.',
    ],
  },
  {
    id: 'outlier',
    title: 'Outlier Detection',
    icon: ShieldAlert,
    badge: 'Analysis',
    steps: [
      'Choose a method: KNN Distance, IQR, or Z-Score.',
      'KNN: spatial outliers based on distance to neighbors.',
      'IQR/Z-Score: statistical outliers in a numeric column.',
      'View outlier list with scores and map visualization.',
    ],
  },
  {
    id: 'cannibalization',
    title: 'Cannibalization',
    icon: CircleDot,
    badge: 'Analysis',
    steps: [
      'Detects overlapping coverage areas between locations.',
      'Set coverage radius and minimum overlap threshold.',
      'Severity levels: Critical / High / Medium / Low.',
      'Auto-generates insights and recommendations.',
    ],
  },
  {
    id: 'locationscore',
    title: 'Location Score',
    icon: Trophy,
    badge: 'Analysis',
    steps: [
      'Build a weighted scoring model with multiple criteria.',
      'Add numeric columns, set weight and direction (higher/lower is better).',
      'Points are scored 0–100 and ranked.',
      'Top-N filter shows only the best locations.',
    ],
  },
  {
    id: 'isochrone',
    title: 'Isochrone (Reachability)',
    icon: Timer,
    badge: 'Analysis',
    steps: [
      'Click on the map to set a center point.',
      'Select time bands (5, 10, 15, 20, 30 min).',
      'Uses OSRM road network for actual driving times.',
      'Shows colored polygon areas reachable within each time.',
      'Counts data points within each reachability zone.',
    ],
    tip: 'Higher accuracy = more API calls. Start with Medium.',
  },
  {
    id: 'nearestfacility',
    title: 'Nearest Facility',
    icon: Locate,
    badge: 'Analysis',
    steps: [
      'Group Split: pick source & facility groups by category.',
      'Each source is matched to its closest facility.',
      'Nearest Neighbor mode: finds each point\'s closest other point.',
      'Shows distance stats (avg, median, min, max) and histogram.',
      'Map draws dashed lines from each source to its match.',
    ],
    tip: 'Use for customer-to-store matching, competitor proximity, etc.',
  },
  {
    id: 'bufferzone',
    title: 'Buffer Zone',
    icon: CircleDashed,
    badge: 'Analysis',
    steps: [
      'Draws circular buffers around each point.',
      'Fixed radius (50m–5km) or variable by a numeric column.',
      'Color by: uniform, category, or overlap intensity.',
      'Detects and counts overlapping buffers.',
      'Shows total coverage area and overlap statistics.',
    ],
    tip: 'Overlap coloring: 🟢 None → 🟡 Low → 🟠 Mid → 🔴 High',
  },
  {
    id: 'spatialjoin',
    title: 'Spatial Join',
    icon: Combine,
    badge: 'Analysis',
    steps: [
      'Category Radius: one group = area centers, another = points to count.',
      'Grid Cells: divides map into grid, counts points per cell.',
      'Optional aggregation: sum or average a numeric column per area.',
      'Sort by count or aggregated value.',
      'Export results as CSV.',
    ],
    tip: 'Example: How many Express stores within 500m of each Flagship?',
  },
  // ─── VISUALIZATION ───
  {
    id: 'cluster',
    title: 'Clustering',
    icon: Layers,
    badge: 'Visualization',
    steps: [
      'Toggle on to group nearby points into clusters.',
      'Clusters auto-expand as you zoom in.',
      'Shows point count per cluster.',
    ],
  },
  {
    id: 'timeseries',
    title: 'Time Series',
    icon: Clock,
    badge: 'Visualization',
    steps: [
      'Select a date/time column to animate data over time.',
      'Use the player controls to step through time frames.',
      'Great for seeing how locations changed over time.',
    ],
  },
  {
    id: 'bivariate',
    title: 'Bivariate Map',
    icon: Layers,
    badge: 'Visualization',
    steps: [
      'Select two numeric columns for X and Y axes.',
      'Points are colored using a 3×3 bivariate color scheme.',
      'Choose from 4 color combinations.',
      'Shows distribution across 9 bins.',
    ],
  },
  {
    id: 'gridhex',
    title: 'Grid / Hex Bin',
    icon: Grid3x3,
    badge: 'Visualization',
    steps: [
      'Aggregates points into grid squares or hexagonal bins.',
      'Choose aggregation: count, sum, or average of a column.',
      'Adjust cell size for finer or coarser resolution.',
    ],
  },
  {
    id: 'heatmap',
    title: 'Heatmap',
    icon: Flame,
    badge: 'Visualization',
    steps: [
      'Visualizes point density as a smooth heat gradient.',
      'Adjust radius, blur, and max zoom for fine-tuning.',
      'Optionally weight by a numeric column (e.g., revenue).',
      '4 color schemes: Blue→Red, Green→Red, Purple→Yellow, Thermal.',
      'Toggle on/off with the switch in the header.',
    ],
    tip: 'Larger radius = smoother. Lower max zoom = more aggregation.',
  },
  {
    id: 'flowmap',
    title: 'Flow Map',
    icon: MoveRight,
    badge: 'Visualization',
    steps: [
      'Group→Group: curved arrows from one category to another.',
      'Hub→All: lines from a single hub to all other points.',
      'Optionally set a value column for line thickness.',
      'Thicker lines = higher flow volume.',
      'Shows top flows list with values and distances.',
    ],
  },
  // ─── UTILITY ───
  {
    id: 'search',
    title: 'Location Search',
    icon: Search,
    badge: 'Utility',
    steps: [
      'Search for any place by name using OpenStreetMap.',
      'Click a result to fly to that location on the map.',
      'Click the map with "Map Select" mode to reverse-geocode a point.',
    ],
  },
  {
    id: 'odmatrix',
    title: 'OD Matrix',
    icon: Table2,
    badge: 'Utility',
    steps: [
      'Computes distance matrix between all point pairs.',
      '"All × All" mode or split by category column.',
      'Shows nearest destination per origin.',
      'Export full matrix as CSV.',
    ],
  },
  {
    id: 'tsp',
    title: 'TSP Route',
    icon: Navigation,
    badge: 'Utility',
    steps: [
      'Finds the optimal route visiting all points via OSRM.',
      'Uses actual road network for real driving distances.',
      'Toggle round trip on/off.',
      'Shows total distance, estimated duration, and leg details.',
    ],
  },
  {
    id: 'route',
    title: 'Route Measure',
    icon: Route,
    badge: 'Utility',
    steps: [
      'Add waypoints by clicking on the map.',
      'Uses OSRM for actual road-based routing.',
      'Shows total distance and estimated driving time per leg.',
      'Drag to reorder waypoints.',
    ],
  },
  {
    id: 'screenshot',
    title: 'Screenshot',
    icon: Camera,
    badge: 'Utility',
    steps: [
      'Captures the current map view as a PNG or JPEG image.',
      'Choose 1× Standard or 2× Retina resolution.',
      'All visible analysis layers are included.',
      'Download the image or copy to clipboard.',
    ],
    tip: 'Pan & zoom to frame your view before capturing.',
  },
  {
    id: 'datatable',
    title: 'Data Table',
    icon: Table2,
    badge: 'Utility',
    steps: [
      'Browse all uploaded data in a sortable table.',
      'Click column headers to sort (toggle asc/desc).',
      'Search across all columns.',
      'Toggle column statistics (min, avg, max, unique counts).',
    ],
  },
  {
    id: 'report',
    title: 'Report & Export',
    icon: FileText,
    badge: 'Utility',
    steps: [
      'Generates a summary report of your data and analysis.',
      'Exports filtered data as CSV.',
    ],
  },
];

export default function GuideTool() {
  const [openSection, setOpenSection] = useState<string | null>('getting-started');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Guide</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {GUIDE_SECTIONS.length} topics
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {GUIDE_SECTIONS.map((section) => {
            const isOpen = openSection === section.id;
            const Icon = section.icon;
            return (
              <div key={section.id} className="mb-0.5">
                <button
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors',
                    isOpen ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[11px] font-medium flex-1">{section.title}</span>
                  {section.badge && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5">
                      {section.badge}
                    </Badge>
                  )}
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 flex-shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-2 pb-2 pt-1 ml-5">
                    <ol className="space-y-1.5">
                      {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[10px] text-muted-foreground leading-relaxed">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {section.tip && (
                      <div className="mt-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-700 leading-relaxed">
                        💡 {section.tip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t bg-muted/20 flex-shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          31 tools · Drag & drop to upload · All client-side
        </p>
      </div>
    </div>
  );
}