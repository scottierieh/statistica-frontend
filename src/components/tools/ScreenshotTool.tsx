// components/tools/ScreenshotTool.tsx
// Screenshot Export — capture the current map view as a PNG image

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  Download,
  Image,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenshotToolProps {
  fileName: string;
}

export default function ScreenshotTool({ fileName }: ScreenshotToolProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState<1 | 2>( 2);
  const [includeUI, setIncludeUI] = useState(false);

  const captureMap = async () => {
    setIsCapturing(true);
    setError(null);
    setLastCapture(null);

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Find the map container
      const mapEl = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapEl) throw new Error('Map element not found');

      const targetEl = includeUI
        ? (mapEl.closest('.flex.h-full') as HTMLElement) || mapEl
        : mapEl;

      const canvas = await html2canvas(targetEl, {
        useCORS: true,
        allowTaint: true,
        scale: quality,
        backgroundColor: '#ffffff',
        logging: false,
        // Ignore certain elements that cause issues
        ignoreElements: (el) => {
          return el.classList?.contains('leaflet-control-zoom') === false && false;
        },
      });

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.92 : undefined);
      setLastCapture(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = () => {
    if (!lastCapture) return;
    const link = document.createElement('a');
    const baseName = fileName ? fileName.replace(/\.\w+$/, '') : 'map';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    link.download = `${baseName}_${timestamp}.${format}`;
    link.href = lastCapture;
    link.click();
  };

  const copyToClipboard = async () => {
    if (!lastCapture) return;
    try {
      const res = await fetch(lastCapture);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch {
      // Fallback: open in new tab
      window.open(lastCapture, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">Screenshot</span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Capture the current map view as an image. Includes all visible
            analysis layers, markers, and overlays.
          </p>

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Format
            </Label>
            <div className="flex gap-1">
              <Button
                variant={format === 'png' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('png')}
                className="flex-1 h-8 text-xs"
              >
                PNG
              </Button>
              <Button
                variant={format === 'jpeg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('jpeg')}
                className="flex-1 h-8 text-xs"
              >
                JPEG
              </Button>
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resolution
            </Label>
            <div className="flex gap-1">
              <Button
                variant={quality === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality(1)}
                className="flex-1 h-8 text-xs"
              >
                1× Standard
              </Button>
              <Button
                variant={quality === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality(2)}
                className="flex-1 h-8 text-xs"
              >
                2× Retina
              </Button>
            </div>
          </div>

          <Separator />

          {/* Capture button */}
          <Button
            onClick={captureMap}
            disabled={isCapturing}
            className="w-full h-12 text-sm"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                Capture Map
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 text-[10px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {lastCapture && (
            <>
              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <Label className="text-xs font-medium text-green-600">
                    Captured!
                  </Label>
                </div>

                {/* Preview thumbnail */}
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  <img
                    src={lastCapture}
                    alt="Map screenshot"
                    className="w-full h-auto"
                    style={{ maxHeight: '200px', objectFit: 'cover' }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button onClick={downloadImage} variant="default" size="sm" className="flex-1 h-9 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                  <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex-1 h-9 text-xs">
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Tips */}
          <div className="rounded-lg border p-2.5 text-[10px] space-y-1.5 text-muted-foreground">
            <div className="font-medium text-foreground text-[11px]">💡 Tips</div>
            <div>• Pan & zoom the map to frame your view before capturing.</div>
            <div>• All visible analysis layers will be included.</div>
            <div>• Use 2× for higher resolution (presentations, print).</div>
            <div>• PNG for transparency, JPEG for smaller file size.</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
