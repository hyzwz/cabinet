import type { TreeNode } from "@/types";

const CODE_EXTENSIONS = new Set([
  ".txt", ".text", ".log", ".mdx", ".rst",
  ".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx", ".css", ".scss", ".html",
  ".swift", ".kt", ".kts", ".java", ".go", ".rs", ".c", ".cpp", ".h",
  ".py", ".rb", ".php", ".sh", ".bash", ".zsh", ".ps1",
  ".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".env", ".xml",
  ".sql", ".graphql", ".gql", ".prisma",
]);

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".ico",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".webm", ".mov", ".m4v",
]);

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".wav", ".ogg", ".m4a", ".aac",
]);

const MERMAID_EXTENSIONS = new Set([".mermaid", ".mmd"]);
const PRESENTATION_EXTENSIONS = new Set([".ppt", ".pptx"]);

// Files that should appear in the sidebar as "unknown" with an Open in Finder fallback.
// Only common document/archive types that a user would intentionally put in a KB.
// Everything not in a known set is silently skipped.
const UNKNOWN_EXTENSIONS = new Set([
  // Office documents
  ".doc", ".docx", ".xls", ".xlsx",
  ".pages", ".numbers", ".key", ".odt", ".ods", ".odp",
  // Archives
  ".zip", ".tar", ".tgz", ".gz", ".rar", ".7z",
  // Installers / packages
  ".dmg", ".pkg", ".apk", ".ipa", ".msi", ".deb", ".rpm",
  // Design
  ".fig", ".sketch", ".psd", ".ai", ".xd",
  // Other documents
  ".epub", ".mobi", ".rtf",
]);

export function classifyFileExtension(ext: string): TreeNode["type"] | null {
  const normalized = ext.toLowerCase();

  if (CODE_EXTENSIONS.has(normalized)) return "code";
  if (IMAGE_EXTENSIONS.has(normalized)) return "image";
  if (VIDEO_EXTENSIONS.has(normalized)) return "video";
  if (AUDIO_EXTENSIONS.has(normalized)) return "audio";
  if (MERMAID_EXTENSIONS.has(normalized)) return "mermaid";
  if (PRESENTATION_EXTENSIONS.has(normalized)) return "presentation";
  if (UNKNOWN_EXTENSIONS.has(normalized)) return "unknown";
  return null;
}
