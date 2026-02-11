// components/map-analysis-app.tsx
// 심플 버전 - 사이드바 없이 전체 화면 Map Workspace

'use client';

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseData } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import type { DataSet } from '@/lib/stats';
import type { MapDataRow } from '@/types/map-analysis';
import MapWorkspace from '@/components/map-workspace/MapWorkspace';

export default function MapAnalysisApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [mapData, setMapData] = useState<MapDataRow[]>([]);

  const { toast } = useToast();

  // Convert DataSet → MapDataRow[]
  const convertToMapData = useCallback(
    (rawData: DataSet, headers: string[]): MapDataRow[] => {
      const latCol = headers.find((h) =>
        ['lat', 'latitude', '위도'].includes(h.toLowerCase())
      );
      const lngCol = headers.find((h) =>
        ['lng', 'lon', 'longitude', '경도'].includes(h.toLowerCase())
      );
      if (!latCol || !lngCol) return [];

      return rawData
        .map((row: any, idx: number) => {
          const lat = parseFloat(row[latCol]);
          const lng = parseFloat(row[lngCol]);
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
          const mapRow: MapDataRow = { id: `row_${idx}`, lat, lng };
          headers.forEach((h) => {
            if (h !== latCol && h !== lngCol) mapRow[h] = row[h];
          });
          return mapRow;
        })
        .filter(Boolean) as MapDataRow[];
    },
    []
  );

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setMapData([]);
  }, []);

  const processData = useCallback(
    (content: string, name: string) => {
      try {
        const {
          headers: newHeaders,
          data: newData,
          numericHeaders: newNumericHeaders,
          categoricalHeaders: newCategoricalHeaders,
        } = parseData(content);

        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setFileName(name);

        const converted = convertToMapData(newData, newHeaders);
        setMapData(converted);

        toast({
          title: 'Data Loaded',
          description: `"${name}" — ${newData.length} rows, ${converted.length} geo points`,
        });

        if (converted.length === 0 && newData.length > 0) {
          toast({
            variant: 'destructive',
            title: 'No geo columns found',
            description: 'Add "lat"/"lng" (or "위도"/"경도") columns for map features.',
          });
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
    },
    [toast, handleClearData, convertToMapData]
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      setIsUploading(true);

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            processData(XLSX.utils.sheet_to_csv(ws), file.name);
          } catch (err: any) {
            toast({ variant: 'destructive', title: 'Excel Error', description: err.message });
            setIsUploading(false);
          }
        };
        reader.readAsBinaryString(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => processData(e.target?.result as string, file.name);
      reader.readAsText(file);
    },
    [processData, toast]
  );

  return (
    <div className="h-screen w-full">
      <MapWorkspace
        data={mapData}
        allHeaders={allHeaders}
        numericHeaders={numericHeaders}
        categoricalHeaders={categoricalHeaders}
        fileName={fileName}
        onFileSelected={handleFileSelected}
        onClearData={handleClearData}
        isUploading={isUploading}
      />
    </div>
  );
}