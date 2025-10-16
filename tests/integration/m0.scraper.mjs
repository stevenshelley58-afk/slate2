#!/usr/bin/env node

import { strict as assert } from "node:assert";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunStateMachine } from "../../packages/state-machine/dist/lifecycle.js";
import { registerPipeline } from "../../services/orchestrator/dist/pipeline.js";

async function main() {
  console.log("🕷️  Running scraper integration test\n");

  const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "scraper");
  const server = await startFixtureServer(fixturesDir);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const machine = new RunStateMachine();
    const context = machine.initializeContext({
      runId: "scraper-test-run",
      tenantId: "tenant-test",
      sourceUrl: `${baseUrl}/`,
      anchorSetVersion: "test-anchor",
      modelRevision: "test-model",
      locale: "en-US",
      currency: "USD",
      autopilotEnabled: false,
    });

    const runtime = {
      context,
      seed: 42,
      artifacts: [],
      segments: [],
      maps: [],
      hooks: [],
    };

    registerPipeline(machine, runtime);
    await machine.start(context);

    console.log("✅ Pipeline completed\n");

    assert(runtime.context.scrape, "Scrape metadata should be attached to context");
    assert(runtime.context.scrape?.thinSite === true, "Thin-site flag should be true for sparse fixture");
    assert(runtime.context.scrape?.stats.pagesCrawled >= 2, "Should crawl at least two public pages");

    const findArtifact = (type) => runtime.artifacts.find((artifact) => artifact.artifactType === type);

    const rawArtifact = findArtifact("scrape_raw");
    assert(rawArtifact, "scrape_raw artifact missing");
    const rawBody = JSON.parse(rawArtifact.body);
    assert(rawBody.pages.length === runtime.context.scrape?.stats.pagesCrawled, "scrape_raw pages should align with stats");

    const textCorpusArtifact = findArtifact("text_corpus");
    assert(textCorpusArtifact, "text_corpus artifact missing");
    const textLines = textCorpusArtifact.body.trim().split("\n").map((line) => JSON.parse(line));
    assert(textLines.length === rawBody.pages.length, "Text corpus should have one entry per crawled page");
    let sawPlaceholder = false;
    for (const record of textLines) {
      assert(!record.text.includes("thin@example.com"), "Emails should be redacted");
      assert(!record.text.includes("555"), "Phone numbers should be redacted");
      if (record.text.includes("[REDACTED_EMAIL]") || record.text.includes("[REDACTED_PHONE]")) {
        sawPlaceholder = true;
      }
    }
    assert(sawPlaceholder, "Redaction placeholders expected");

    const mediaArtifact = findArtifact("media_index");
    assert(mediaArtifact, "media_index artifact missing");
    const mediaIndex = JSON.parse(mediaArtifact.body);
    assert(mediaIndex.media.length === 1, "Should index one image from the fixture");

    const crawlLogArtifact = findArtifact("crawl_log");
    assert(crawlLogArtifact, "crawl_log artifact missing");
    const crawlLog = JSON.parse(crawlLogArtifact.body);
    assert(crawlLog.entries.some((entry) => entry.reason === "robots_txt_disallow"), "Robots.txt disallow should be logged");

    assert(runtime.segments.length === 1, "Thin-site gating should limit segments to one");
    assert(runtime.hooks.length <= 3, "Thin-site gating should limit hook count");

    const qaArtifact = findArtifact("qa_report");
    assert(qaArtifact, "QA artifact missing");
    assert(qaArtifact.body.includes("Thin-site mode active"), "QA report should mention thin-site mode");

    const exportArtifact = findArtifact("export_manifest");
    assert(exportArtifact, "Export manifest missing");
    assert(exportArtifact.body.includes("Thin-site mode: active"), "Export manifest should note thin-site mode");

    console.log("🎉 All scraper integration assertions passed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function startFixtureServer(fixturesDir) {
  const robotText = "User-agent: *\nDisallow: /private\nAllow: /contact\n";
  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.writeHead(400).end("Bad request");
        return;
      }
      if (req.url === "/robots.txt") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(robotText);
        return;
      }
      if (req.url === "/media/logo.png") {
        res.writeHead(200, { "content-type": "image/png" });
        res.end("PNG");
        return;
      }
      if (req.url === "/private") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html><body>Should not crawl</body></html>");
        return;
      }
      const rawPath = req.url === "/" ? "index.html" : `${req.url.replace(/^\//, "")}`;
      const filePath = rawPath.endsWith(".html") ? rawPath : `${rawPath}.html`;
      const file = await readFile(join(fixturesDir, filePath));
      res.writeHead(200, { "content-type": "text/html" });
      res.end(file);
    } catch (error) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end(`Not found: ${req.url} (${error.message})`);
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

main().catch((error) => {
  console.error("❌ Scraper integration failed", error);
  process.exitCode = 1;
});
