// Prerenders the landing page to a single static index.html at the root of the Pages repo.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingPage } from "../src/LandingPage";

const landingDirectory = fileURLToPath(new URL("..", import.meta.url));
const outputFile = fileURLToPath(new URL("../../index.html", import.meta.url));

function compileStyles() {
  return execFileSync("npx", ["tailwindcss", "--input", "src/styles.css", "--minify"], {
    cwd: landingDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const markup = renderToStaticMarkup(<LandingPage styles={compileStyles()} />);
writeFileSync(outputFile, `<!doctype html>${markup}\n`);
console.log(`Wrote ${outputFile}`);
