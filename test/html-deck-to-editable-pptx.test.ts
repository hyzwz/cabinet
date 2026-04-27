import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";

test("html deck converter produces editable PPTX text and separate media", async (t) => {
  const dependencyCheck = spawnSync(
    "python3",
    ["-c", "import bs4, pptx"],
    { encoding: "utf8" },
  );
  if (dependencyCheck.status !== 0) {
    t.skip("python dependencies beautifulsoup4 and python-pptx are not installed");
    return;
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "cabinet-html-deck-pptx-"));
  const htmlPath = path.join(tempDir, "deck.html");
  const imagePath = path.join(tempDir, "pixel.png");
  const outputPath = path.join(tempDir, "editable.pptx");

  try {
    writeFileSync(
      imagePath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    writeFileSync(
      htmlPath,
      `<!doctype html>
      <html>
        <body>
          <section class="slide dark">
            <div class="chrome"><span>Cabinet</span><span>01 / 02</span></div>
            <p class="kicker">AI + TAX</p>
            <h1>AI 财税服务升级建议</h1>
            <p class="lead">不是试用，而是 90 天跑通闭环。</p>
            <figure><img src="pixel.png" /></figure>
            <div class="foot"><span>Demo</span><span>01 / 02</span></div>
          </section>
          <section class="slide">
            <div class="chrome"><span>Cabinet</span><span>02 / 02</span></div>
            <p class="kicker">OPERATING MODEL</p>
            <h2>事务所的 AI 竞争力</h2>
            <p class="lead">把知识库、流程和复核机制变成组织能力。</p>
            <div class="stat-card">
              <div class="stat-label">闭环</div>
              <div class="stat-note">从线索到交付</div>
              <div class="stat-nb">90 天跑通闭环</div>
            </div>
            <div class="foot"><span>Demo</span><span>02 / 02</span></div>
          </section>
        </body>
      </html>`,
      "utf8",
    );

    const result = spawnSync(
      "python3",
      [
        "scripts/html_deck_to_editable_pptx.py",
        htmlPath,
        outputPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);

    const pptx = await JSZip.loadAsync(readFileSync(outputPath));
    const slideFiles = Object.keys(pptx.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort();
    assert.equal(slideFiles.length, 2);

    const firstSlide = await pptx.file("ppt/slides/slide1.xml")!.async("text");
    assert.match(firstSlide, /AI 财税服务/);
    assert.match(firstSlide, /升级建议/);

    const allSlideXml = (
      await Promise.all(slideFiles.map((name) => pptx.file(name)!.async("text")))
    ).join("\n");
    assert.match(allSlideXml, /不是试用/);
    assert.match(allSlideXml, /90 天跑通闭环/);
    assert.match(allSlideXml, /事务所的 AI 竞争力/);

    const mediaFiles = Object.keys(pptx.files).filter((name) => name.startsWith("ppt/media/"));
    assert.ok(mediaFiles.length >= 1, "expected original deck images to remain as separate media");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
