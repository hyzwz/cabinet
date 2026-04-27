import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const OFFICE_COMMANDS = ["soffice", "libreoffice"];

async function runOfficeConversion(
  command: string,
  inputPath: string,
  outputDir: string,
  profileDir: string
): Promise<void> {
  await execFileAsync(
    command,
    [
      `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
      "--headless",
      "--nologo",
      "--nofirststartwizard",
      "--norestore",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ],
    {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    }
  );
}

export function getConvertedPdfPath(inputPath: string, outputDir: string): string {
  return path.join(
    outputDir,
    `${path.basename(inputPath, path.extname(inputPath))}.pdf`
  );
}

export async function convertPptxToPdf(inputPath: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-pptx-preview-"));
  const outputDir = path.join(tempDir, "out");
  const profileDir = path.join(tempDir, "profile");

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(profileDir, { recursive: true });

    let lastError: unknown = null;
    for (const command of OFFICE_COMMANDS) {
      try {
        await runOfficeConversion(command, inputPath, outputDir, profileDir);
        const pdfPath = getConvertedPdfPath(inputPath, outputDir);
        return await fs.readFile(pdfPath);
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Unknown conversion error";
    throw new Error(`Unable to convert PPTX to PDF preview: ${message}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
