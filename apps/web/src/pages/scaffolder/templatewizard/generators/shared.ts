export type ScaffoldFile = {
  path: string;
  content: string;
};

export function toYaml(files: ScaffoldFile[]): string {
  const lines = ["files:"];
  for (const file of files) {
    lines.push(`  - path: ${file.path}`, "    content: |");
    for (const line of file.content.split("\n")) {
      lines.push(`      ${line}`);
    }
  }
  return lines.join("\n");
}
