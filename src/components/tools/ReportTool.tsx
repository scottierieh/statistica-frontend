// components/tools/ReportTool.tsx
// 리포트 내보내기 도구 - CSV/JSON 다운로드 + 분석 요약 + 스크린샷 가이드

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { MapDataRow, FilterConfig, RadiusAnalysis } from '@/types/map-analysis';
import { dataToCSV, formatNumber } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  FileJson,
  FileSpreadsheet,
  Image,
  Printer,
  Copy,
  Check,
  ChevronDown,
  BarChart3,
  MapPin,
  Clock,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type ExportFormat = 'csv' | 'json' | 'summary';

interface AnalysisSnapshot {
  totalRows: number;
  filteredRows: number;
  activeFilters: FilterConfig[];
  radiusAnalysis: RadiusAnalysis | null;
  activeTools: string[];
  timestamp: string;
}

interface ReportToolProps {
  data: MapDataRow[];
  filteredData: MapDataRow[];
  filters: FilterConfig[];
  radiusAnalysis: RadiusAnalysis | null;
  activeTools: string[];
  fileName: string;
}

export default function ReportTool({
  data,
  filteredData,
  filters,
  radiusAnalysis,
  activeTools,
  fileName,
}: ReportToolProps) {
  const [reportTitle, setReportTitle] = useState('Map Analysis Report');
  const [reportNotes, setReportNotes] = useState('');
  const [includeRaw, setIncludeRaw] = useState(true);
  const [includeFiltered, setIncludeFiltered] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['export', 'summary']);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Build analysis snapshot
  const snapshot = useMemo<AnalysisSnapshot>(
    () => ({
      totalRows: data.length,
      filteredRows: filteredData.length,
      activeFilters: filters,
      radiusAnalysis,
      activeTools,
      timestamp: new Date().toISOString(),
    }),
    [data, filteredData, filters, radiusAnalysis, activeTools]
  );

  // ─────────────────────────────────────────
  // Export functions
  // ─────────────────────────────────────────
  const downloadFile = useCallback(
    (content: string, filename: string, mimeType: string) => {
      const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    []
  );

  const exportCSV = useCallback(
    (useFiltered: boolean) => {
      const target = useFiltered ? filteredData : data;
      const csv = dataToCSV(target);
      const suffix = useFiltered ? '_filtered' : '_full';
      const name = fileName.replace(/\.[^.]+$/, '') || 'map_data';
      downloadFile(csv, `${name}${suffix}.csv`, 'text/csv');
    },
    [data, filteredData, fileName, downloadFile]
  );

  const exportJSON = useCallback(
    (useFiltered: boolean) => {
      const target = useFiltered ? filteredData : data;
      const json = JSON.stringify(
        {
          meta: {
            title: reportTitle,
            notes: reportNotes,
            exportedAt: new Date().toISOString(),
            totalRows: data.length,
            filteredRows: filteredData.length,
            filters: filters,
          },
          data: target,
        },
        null,
        2
      );
      const name = fileName.replace(/\.[^.]+$/, '') || 'map_data';
      const suffix = useFiltered ? '_filtered' : '_full';
      downloadFile(json, `${name}${suffix}.json`, 'application/json');
    },
    [data, filteredData, filters, fileName, reportTitle, reportNotes, downloadFile]
  );

  const exportGeoJSON = useCallback(() => {
    const features = filteredData.map((row) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [row.lng, row.lat],
      },
      properties: Object.fromEntries(
        Object.entries(row).filter(([k]) => !['lat', 'lng'].includes(k))
      ),
    }));

    const geojson = JSON.stringify(
      {
        type: 'FeatureCollection',
        features,
      },
      null,
      2
    );

    const name = fileName.replace(/\.[^.]+$/, '') || 'map_data';
    downloadFile(geojson, `${name}.geojson`, 'application/geo+json');
  }, [filteredData, fileName, downloadFile]);

  // ─────────────────────────────────────────
  // Summary text generation
  // ─────────────────────────────────────────
  const summaryText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${reportTitle}`);
    lines.push(`Generated: ${new Date().toLocaleString('ko-KR')}`);
    lines.push('');

    if (reportNotes) {
      lines.push(`## Notes`);
      lines.push(reportNotes);
      lines.push('');
    }

    lines.push(`## Data Overview`);
    lines.push(`- Source: ${fileName || 'Unknown'}`);
    lines.push(`- Total rows: ${formatNumber(data.length)}`);
    lines.push(`- Filtered rows: ${formatNumber(filteredData.length)}`);
    lines.push(`- Active filters: ${filters.length}`);
    lines.push('');

    if (filters.length > 0) {
      lines.push(`## Active Filters`);
      filters.forEach((f) => {
        if (f.type === 'range') {
          lines.push(`- ${f.column}: ${f.min ?? '—'} ~ ${f.max ?? '—'}`);
        } else if (f.type === 'category') {
          lines.push(
            `- ${f.column}: ${f.selectedCategories?.join(', ') ?? 'All'}`
          );
        } else if (f.type === 'search') {
          lines.push(`- ${f.column}: contains "${f.searchTerm}"`);
        }
      });
      lines.push('');
    }

    if (radiusAnalysis) {
      lines.push(`## Radius Analysis`);
      lines.push(
        `- Center: ${radiusAnalysis.center.lat.toFixed(5)}, ${radiusAnalysis.center.lng.toFixed(5)}`
      );
      lines.push(`- Radius: ${radiusAnalysis.radiusMeters}m`);
      lines.push(`- Points inside: ${radiusAnalysis.stats.totalPoints}`);
      Object.entries(radiusAnalysis.stats)
        .filter(([k]) => k !== 'totalPoints')
        .forEach(([k, v]) => {
          lines.push(`- ${k}: ${formatNumber(v)}`);
        });
      lines.push('');
    }

    lines.push(`## Active Tools`);
    lines.push(activeTools.length > 0 ? activeTools.join(', ') : 'None');

    return lines.join('\n');
  }, [reportTitle, reportNotes, data, filteredData, filters, radiusAnalysis, activeTools, fileName]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const printSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
          h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { color: #555; margin-top: 24px; }
          ul { padding-left: 20px; }
          li { margin: 4px 0; }
          .meta { color: #888; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em; }
          th { background: #f5f5f5; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <p class="meta">Generated: ${new Date().toLocaleString('ko-KR')}</p>
        ${reportNotes ? `<h2>Notes</h2><p>${reportNotes}</p>` : ''}
        <h2>Data Overview</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Source File</td><td>${fileName || 'N/A'}</td></tr>
          <tr><td>Total Rows</td><td>${data.length.toLocaleString()}</td></tr>
          <tr><td>Filtered Rows</td><td>${filteredData.length.toLocaleString()}</td></tr>
          <tr><td>Active Filters</td><td>${filters.length}</td></tr>
          <tr><td>Active Tools</td><td>${activeTools.join(', ') || 'None'}</td></tr>
        </table>
        ${
          radiusAnalysis
            ? `
          <h2>Radius Analysis</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Center</td><td>${radiusAnalysis.center.lat.toFixed(5)}, ${radiusAnalysis.center.lng.toFixed(5)}</td></tr>
            <tr><td>Radius</td><td>${radiusAnalysis.radiusMeters}m</td></tr>
            ${Object.entries(radiusAnalysis.stats)
              .map(([k, v]) => `<tr><td>${k}</td><td>${formatNumber(v)}</td></tr>`)
              .join('')}
          </table>`
            : ''
        }
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">Report & Export</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-3">
          {/* Report info */}
          <div className="space-y-2">
            <Label className="text-xs">Report Title</Label>
            <Input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="h-8 text-xs"
              placeholder="Analysis report title"
            />
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
              placeholder="Add notes about this analysis..."
            />
          </div>

          <Separator />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Total"
              value={data.length.toLocaleString()}
            />
            <StatCard
              icon={<Filter className="h-3.5 w-3.5" />}
              label="Filtered"
              value={filteredData.length.toLocaleString()}
            />
          </div>

          <Separator />

          {/* Export section */}
          <Collapsible
            open={openSections.includes('export')}
            onOpenChange={() => toggleSection('export')}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-1 text-xs font-medium">
                <span className="uppercase tracking-wide text-muted-foreground">
                  Data Export
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform text-muted-foreground',
                    openSections.includes('export') && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {/* CSV */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(false)}
                  disabled={data.length === 0}
                  className="flex-1 h-8 text-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                  CSV (All)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(true)}
                  disabled={filteredData.length === 0}
                  className="flex-1 h-8 text-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                  CSV (Filtered)
                </Button>
              </div>

              {/* JSON */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportJSON(false)}
                  disabled={data.length === 0}
                  className="flex-1 h-8 text-xs"
                >
                  <FileJson className="h-3.5 w-3.5 mr-1" />
                  JSON (All)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportJSON(true)}
                  disabled={filteredData.length === 0}
                  className="flex-1 h-8 text-xs"
                >
                  <FileJson className="h-3.5 w-3.5 mr-1" />
                  JSON (Filtered)
                </Button>
              </div>

              {/* GeoJSON */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportGeoJSON}
                disabled={filteredData.length === 0}
                className="w-full h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                GeoJSON (for QGIS/Mapbox)
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Summary section */}
          <Collapsible
            open={openSections.includes('summary')}
            onOpenChange={() => toggleSection('summary')}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-1 text-xs font-medium">
                <span className="uppercase tracking-wide text-muted-foreground">
                  Report Summary
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform text-muted-foreground',
                    openSections.includes('summary') && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {/* Preview */}
              <div className="rounded-md border bg-muted/20 p-2 max-h-[200px] overflow-auto">
                <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed">
                  {summaryText}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex-1 h-8 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    downloadFile(summaryText, `${reportTitle.replace(/\s+/g, '_')}.md`, 'text/markdown');
                  }}
                  className="flex-1 h-8 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Save .md
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printSummary}
                  className="flex-1 h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Screenshot guide */}
          <div className="rounded-md border border-dashed p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Image className="h-3.5 w-3.5" />
              Map Screenshot
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              지도 이미지를 캡처하려면 브라우저의 스크린샷 기능을 사용하세요:
            </p>
            <div className="space-y-0.5 text-[10px] text-muted-foreground">
              <p>• <strong>Mac:</strong> ⌘ + Shift + 4 (영역 선택)</p>
              <p>• <strong>Windows:</strong> Win + Shift + S</p>
              <p>• <strong>Chrome:</strong> DevTools → ⌘+Shift+P → "screenshot"</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="text-sm font-bold font-mono">{value}</div>
    </div>
  );
}
