import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import { classifyFileExtension } from "@/lib/editor/file-types";
import { parsePptxPreview } from "@/lib/previews/pptx";

test("classifyFileExtension routes PowerPoint files to presentation preview", () => {
  assert.equal(classifyFileExtension(".pptx"), "presentation");
  assert.equal(classifyFileExtension(".ppt"), "presentation");
});

test("parsePptxPreview extracts ordered slide text from a pptx archive", async () => {
  const zip = new JSZip();
  zip.file(
    "ppt/slides/slide2.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
      ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
      "<p:cSld><p:spTree><p:sp><p:txBody>",
      "<a:p><a:r><a:t>第二页重点</a:t></a:r></a:p>",
      "</p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
    ].join("")
  );
  zip.file(
    "ppt/slides/slide1.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
      ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
      "<p:cSld><p:spTree><p:sp><p:txBody>",
      "<a:p><a:r><a:t>AI财税服务升级建议</a:t></a:r></a:p>",
      "<a:p><a:r><a:t>效率 &amp; 风险控制</a:t></a:r></a:p>",
      "</p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
    ].join("")
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const preview = await parsePptxPreview(buffer);

  assert.equal(preview.slideCount, 2);
  assert.deepEqual(
    preview.slides.map((slide) => slide.title),
    ["AI财税服务升级建议", "第二页重点"]
  );
  assert.deepEqual(preview.slides[0].paragraphs, [
    "AI财税服务升级建议",
    "效率 & 风险控制",
  ]);
});

test("presentation viewer prefers visual PDF preview and keeps text outline fallback", async () => {
  const source = await fs.readFile(
    new URL("../src/components/editor/presentation-viewer.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /format=pdf/);
  assert.match(source, /<iframe/);
  assert.match(source, /Text outline/);
  assert.match(source, /Visual PPTX preview is unavailable/);
  assert.doesNotMatch(source, /aspect-video/);
});

test("presentation preview route exposes PDF conversion mode", async () => {
  const source = await fs.readFile(
    new URL("../src/app/api/previews/presentation/[...path]/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /format"\) === "pdf"/);
  assert.match(source, /Content-Type": "application\/pdf"/);
});
