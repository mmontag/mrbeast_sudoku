import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sudokusDir = path.join(projectRoot, "public", "sudokus");
const manifestPath = path.join(sudokusDir, "index.json");

async function run() {
  const entries = await fs.readdir(sudokusDir, { withFileTypes: true });
  const puzzles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => {
      const name = path.basename(entry.name, ".txt");
      return {
        name,
        file: entry.name,
      };
    })
    .sort((a, b) => {
      const aNum = Number.parseInt(a.name, 10);
      const bNum = Number.parseInt(b.name, 10);

      if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
        return aNum - bNum;
      }

      return a.name.localeCompare(b.name);
    });

  await fs.writeFile(manifestPath, `${JSON.stringify(puzzles, null, 2)}\n`, "utf8");
  console.log(`Wrote ${puzzles.length} puzzle entries to ${manifestPath}`);
}

run().catch((error) => {
  console.error("Failed to generate sudokus index:", error);
  process.exitCode = 1;
});

