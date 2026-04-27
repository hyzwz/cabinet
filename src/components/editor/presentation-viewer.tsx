"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Presentation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/components/layout/header-actions";

interface PresentationSlidePreview {
  index: number;
  title: string;
  paragraphs: string[];
}

interface PresentationPreview {
  slideCount: number;
  slides: PresentationSlidePreview[];
}

interface PresentationViewerProps {
  path: string;
  title: string;
}

export function PresentationViewer({ path, title }: PresentationViewerProps) {
  const assetUrl = `/api/assets/${path}`;
  const previewUrl = `/api/previews/presentation/${path}`;
  const pdfPreviewUrl = `${previewUrl}?format=pdf`;
  const filename = path.split("/").pop() || path;
  const ext = filename.includes(".") ? filename.split(".").pop()!.toUpperCase() : "PPTX";
  const isPptx = filename.toLowerCase().endsWith(".pptx");
  const [preview, setPreview] = useState<PresentationPreview | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(isPptx);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(isPptx ? null : "Legacy .ppt files cannot be parsed in Cabinet yet.");

  const loadPreview = useMemo(
    () => async () => {
      if (!isPptx) return;
      setOutlineLoading(true);
      setError(null);
      try {
        const res = await fetch(previewUrl, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load presentation preview");
        }
        setPreview(data);
      } catch (e) {
        setPreview(null);
        setError(e instanceof Error ? e.message : "Failed to load presentation preview");
      } finally {
        setOutlineLoading(false);
      }
    },
    [isPptx, previewUrl]
  );

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (!isPptx) return;

    let cancelled = false;
    setPdfReady(false);
    setPdfError(null);

    fetch(pdfPreviewUrl, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Visual preview is unavailable");
        }
        if (!cancelled) setPdfReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setPdfError(e instanceof Error ? e.message : "Visual preview is unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPptx, pdfPreviewUrl]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium truncate">{title}</span>
          <span className="text-xs text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
            {ext}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              const a = document.createElement("a");
              a.href = assetUrl;
              a.download = filename;
              a.click();
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => window.open(assetUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </Button>
          <HeaderActions />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/20">
        {pdfReady ? (
          <iframe
            title={`${title} visual preview`}
            src={pdfPreviewUrl}
            className="h-full w-full border-0 bg-background"
          />
        ) : outlineLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading presentation preview...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm space-y-4 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted">
                <Presentation className="size-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{filename}</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              {isPptx && (
                <Button variant="outline" size="sm" className="gap-2" onClick={loadPreview}>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        ) : preview && preview.slides.length > 0 ? (
          <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
            <div className="rounded-md border border-border bg-background px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Presentation className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Text outline</span>
                    <span className="text-xs text-muted-foreground">
                      {preview.slideCount} slides
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Visual PPTX preview is unavailable here, so Cabinet is showing an extracted text outline.
                    Use Download or Open in new tab to view the original layout in PowerPoint, WPS, or your browser.
                    {pdfError ? ` (${pdfError})` : ""}
                  </p>
                </div>
              </div>
            </div>
            {preview.slides.map((slide, slideIndex) => (
              <section
                key={slide.index}
                className="rounded-md border border-border bg-background px-4 py-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Slide {slideIndex + 1}
                    </div>
                    <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
                      {slide.title}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {slide.paragraphs.length} text blocks
                  </span>
                </div>
                <div className="space-y-2">
                  {slide.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${slide.index}-${index}`}
                      className={
                        index === 0
                          ? "text-sm font-medium leading-relaxed text-foreground"
                          : "text-sm leading-relaxed text-muted-foreground"
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No slide text found in this presentation.
          </div>
        )}
      </div>
    </div>
  );
}
