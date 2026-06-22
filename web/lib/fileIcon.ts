import { File, FileCode, FileJson, FileText, Image, Palette, FileCog, Terminal, Database, type LucideIcon } from 'lucide-react';

/** Pick a lucide icon for a file path by extension, so changed-file lists read at a glance.
 *  Unknown extensions fall back to a generic file icon. */
const EXT_ICON: Record<string, LucideIcon> = {
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode, mjs: FileCode, cjs: FileCode,
  go: FileCode, rs: FileCode, php: FileCode, py: FileCode, html: FileCode,
  json: FileJson,
  css: Palette, scss: Palette,
  md: FileText, markdown: FileText, txt: FileText,
  yml: FileCog, yaml: FileCog, toml: FileCog, env: FileCog, ini: FileCog,
  sh: Terminal, bash: Terminal,
  sql: Database,
  png: Image, jpg: Image, jpeg: Image, gif: Image, svg: Image, webp: Image,
};

const extOf = (p: string) => p.split('/').pop()?.split('.').pop()?.toLowerCase() ?? '';

export function fileIcon(path: string): LucideIcon {
  return EXT_ICON[extOf(path)] ?? File;
}
