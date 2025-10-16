import fetch, { type RequestInit, type Response } from "node-fetch";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

type RobotsRules = {
  allows: string[];
  disallows: string[];
  crawlDelayMs?: number;
};

type QueueItem = {
  url: URL;
  depth: number;
};

type MediaRecord = {
  url: string;
  type: string;
  alt?: string;
  source_page: string;
};

type ScrapedPage = {
  url: string;
  depth: number;
  status: number;
  content_type: string | null;
  text_bytes: number;
  text_sample: string;
  media: MediaRecord[];
  links: string[];
  captured_at: string;
};

type TextCorpusRecord = {
  url: string;
  title: string;
  text: string;
};

type CrawlLogEntry = {
  url: string;
  depth: number;
  allowed: boolean;
  status?: number;
  reason?: string;
  duration_ms: number;
  timestamp: string;
};

type ScrapeStats = {
  pagesCrawled: number;
  totalTextBytes: number;
  mediaCount: number;
  blockedByRobots: number;
  maxDepthReached: number;
  durationMs: number;
};

type ScrapeRawArtifact = {
  run_id: string;
  entry_url: string;
  captured_at: string;
  thin_site: boolean;
  pages: ScrapedPage[];
  stats: ScrapeStats & { blocked_by_robots: number };
};

type MediaIndexArtifact = {
  run_id: string;
  generated_at: string;
  media: MediaRecord[];
};

type CrawlLogArtifact = {
  run_id: string;
  generated_at: string;
  entries: CrawlLogEntry[];
};

type ScrapeArtifacts = {
  scrapeRaw: {
    artifactType: "scrape_raw";
    data: ScrapeRawArtifact;
  };
  textCorpus: {
    artifactType: "text_corpus";
    records: TextCorpusRecord[];
  };
  mediaIndex: {
    artifactType: "media_index";
    data: MediaIndexArtifact;
  };
  crawlLog: {
    artifactType: "crawl_log";
    data: CrawlLogArtifact;
  };
};

export type ScraperOptions = {
  runId: string;
  entryUrl: string;
  allowedHosts?: string[];
  maxDepth?: number;
  maxPages?: number;
  rateLimitMs?: number;
  fetchImpl?: FetchLike;
  userAgent?: string;
};

export type ScrapeResult = {
  thinSite: boolean;
  stats: ScrapeStats;
  artifacts: ScrapeArtifacts;
};

const DEFAULT_RATE_LIMIT_MS = 150;
const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_PAGES = 12;

const defaultFetch: FetchLike = fetch as FetchLike;

export async function runScraper(options: ScraperOptions): Promise<ScrapeResult> {
  const start = Date.now();
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const allowedHosts = new Set(
    (options.allowedHosts && options.allowedHosts.length > 0)
      ? options.allowedHosts.map((host) => host.toLowerCase())
      : [new URL(options.entryUrl).host.toLowerCase()],
  );
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const requestedRateLimit = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  const robotsCache = new Map<string, RobotsRules | null>();
  const lastFetchByHost = new Map<string, number>();
  const visited = new Set<string>();
  const queue: QueueItem[] = [{ url: new URL(options.entryUrl), depth: 0 }];

  const pages: ScrapedPage[] = [];
  const textCorpus: TextCorpusRecord[] = [];
  const mediaRecords: MediaRecord[] = [];
  const crawlLog: CrawlLogEntry[] = [];

  let blockedByRobots = 0;
  let maxDepthReached = 0;

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift();
    if (!next) {
      break;
    }
    const normalizedUrl = normalizeUrl(next.url);
    if (visited.has(normalizedUrl)) {
      continue;
    }
    visited.add(normalizedUrl);

    if (!allowedHosts.has(next.url.host.toLowerCase())) {
      crawlLog.push({
        url: normalizedUrl,
        depth: next.depth,
        allowed: false,
        reason: "host_not_allowed",
        duration_ms: 0,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (next.depth > maxDepth) {
      crawlLog.push({
        url: normalizedUrl,
        depth: next.depth,
        allowed: false,
        reason: "max_depth_exceeded",
        duration_ms: 0,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const robots = await loadRobots(next.url, robotsCache, fetchImpl, options.userAgent);
    if (robots && !isAllowedByRobots(next.url.pathname, robots)) {
      blockedByRobots += 1;
      crawlLog.push({
        url: normalizedUrl,
        depth: next.depth,
        allowed: false,
        reason: "robots_txt_disallow",
        duration_ms: 0,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const host = next.url.host.toLowerCase();
    const effectiveRateLimit = Math.max(requestedRateLimit, robots?.crawlDelayMs ?? 0);
    const lastFetch = lastFetchByHost.get(host);
    if (lastFetch && effectiveRateLimit > 0) {
      const elapsed = Date.now() - lastFetch;
      if (elapsed < effectiveRateLimit) {
        await wait(effectiveRateLimit - elapsed);
      }
    }

    const fetchStarted = Date.now();
    try {
      const response = await fetchImpl(next.url.toString(), {
        headers: options.userAgent ? { "user-agent": options.userAgent } : undefined,
      });
      lastFetchByHost.set(host, Date.now());

      const contentType = response.headers.get("content-type");
      const status = response.status;
      const duration = Date.now() - fetchStarted;

      if (status >= 400) {
        crawlLog.push({
          url: normalizedUrl,
          depth: next.depth,
          allowed: true,
          status,
          reason: "http_error",
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      if (contentType && !contentType.includes("text")) {
        crawlLog.push({
          url: normalizedUrl,
          depth: next.depth,
          allowed: true,
          status,
          reason: "unsupported_content_type",
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const rawHtml = await response.text();
      const parsed = parseHtml(rawHtml, next.url);
      const redactedText = redactPii(parsed.text);
      const title = redactPii(parsed.title);
      const textBytes = Buffer.byteLength(redactedText, "utf-8");

      pages.push({
        url: normalizedUrl,
        depth: next.depth,
        status,
        content_type: contentType,
        text_bytes: textBytes,
        text_sample: redactedText.slice(0, 280),
        media: parsed.media,
        links: parsed.links,
        captured_at: new Date().toISOString(),
      });

      textCorpus.push({
        url: normalizedUrl,
        title,
        text: redactedText,
      });

      for (const media of parsed.media) {
        mediaRecords.push(media);
      }

      crawlLog.push({
        url: normalizedUrl,
        depth: next.depth,
        allowed: true,
        status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });

      maxDepthReached = Math.max(maxDepthReached, next.depth);

      for (const link of parsed.links) {
        if (pages.length >= maxPages) {
          break;
        }
        try {
          const linkUrl = new URL(link);
          if (!allowedHosts.has(linkUrl.host.toLowerCase())) {
            continue;
          }
          queue.push({ url: linkUrl, depth: next.depth + 1 });
        } catch {
          // ignore malformed URLs
        }
      }
    } catch (error) {
      crawlLog.push({
        url: normalizedUrl,
        depth: next.depth,
        allowed: true,
        reason: error instanceof Error ? `fetch_error:${error.message}` : "fetch_error",
        duration_ms: Date.now() - fetchStarted,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const totalTextBytes = textCorpus.reduce(
    (sum, record) => sum + Buffer.byteLength(record.text, "utf-8"),
    0,
  );
  const mediaCount = mediaRecords.length;

  const thinSite = totalTextBytes < 1500 || textCorpus.length < 3;

  const stats: ScrapeStats = {
    pagesCrawled: pages.length,
    totalTextBytes,
    mediaCount,
    blockedByRobots,
    maxDepthReached,
    durationMs: Date.now() - start,
  };

  const nowIso = new Date().toISOString();

  const artifacts: ScrapeArtifacts = {
    scrapeRaw: {
      artifactType: "scrape_raw",
      data: {
        run_id: options.runId,
        entry_url: options.entryUrl,
        captured_at: nowIso,
        thin_site: thinSite,
        pages,
        stats: {
          ...stats,
          blocked_by_robots: blockedByRobots,
        },
      },
    },
    textCorpus: {
      artifactType: "text_corpus",
      records: textCorpus,
    },
    mediaIndex: {
      artifactType: "media_index",
      data: {
        run_id: options.runId,
        generated_at: nowIso,
        media: mediaRecords,
      },
    },
    crawlLog: {
      artifactType: "crawl_log",
      data: {
        run_id: options.runId,
        generated_at: nowIso,
        entries: crawlLog,
      },
    },
  };

  return {
    thinSite,
    stats,
    artifacts,
  };
}

function normalizeUrl(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  normalized.searchParams.sort();
  return normalized.toString();
}

async function loadRobots(
  url: URL,
  cache: Map<string, RobotsRules | null>,
  fetchImpl: FetchLike,
  userAgent?: string,
): Promise<RobotsRules | null> {
  const host = url.host.toLowerCase();
  if (cache.has(host)) {
    return cache.get(host) ?? null;
  }

  const robotsUrl = new URL("/robots.txt", `${url.protocol}//${url.host}`);
  try {
    const response = await fetchImpl(robotsUrl.toString(), {
      headers: userAgent ? { "user-agent": userAgent } : undefined,
    });
    if (!response.ok) {
      cache.set(host, null);
      return null;
    }
    const text = await response.text();
    const rules = parseRobots(text);
    cache.set(host, rules);
    return rules;
  } catch {
    cache.set(host, null);
    return null;
  }
}

function parseRobots(content: string): RobotsRules {
  const lines = content.split(/\r?\n/);
  const allows: string[] = [];
  const disallows: string[] = [];
  let crawlDelayMs: number | undefined;
  let applies = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const [directiveRaw, valueRaw] = line.split(":", 2);
    if (!directiveRaw || valueRaw === undefined) {
      continue;
    }
    const directive = directiveRaw.trim().toLowerCase();
    const value = valueRaw.trim();
    if (directive === "user-agent") {
      applies = value === "*";
    } else if (!applies) {
      continue;
    } else if (directive === "allow") {
      allows.push(value);
    } else if (directive === "disallow") {
      if (value.length > 0) {
        disallows.push(value);
      }
    } else if (directive === "crawl-delay") {
      const seconds = Number.parseFloat(value);
      if (!Number.isNaN(seconds)) {
        crawlDelayMs = Math.round(seconds * 1000);
      }
    }
  }

  return { allows, disallows, crawlDelayMs };
}

function isAllowedByRobots(pathname: string, rules: RobotsRules): boolean {
  if (rules.disallows.length === 0) {
    return true;
  }

  const path = pathname.endsWith("/") ? pathname : `${pathname}`;

  let allowMatchLength = -1;
  for (const allow of rules.allows) {
    if (allow === "") {
      continue;
    }
    if (path.startsWith(allow) && allow.length > allowMatchLength) {
      allowMatchLength = allow.length;
    }
  }

  let disallowMatchLength = -1;
  for (const disallow of rules.disallows) {
    if (disallow === "") {
      continue;
    }
    if (path.startsWith(disallow) && disallow.length > disallowMatchLength) {
      disallowMatchLength = disallow.length;
    }
  }

  if (disallowMatchLength === -1) {
    return true;
  }
  return allowMatchLength >= disallowMatchLength;
}

function parseHtml(html: string, base: URL): {
  title: string;
  text: string;
  links: string[];
  media: MediaRecord[];
} {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const titleMatch = withoutScripts.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : base.hostname;

  const text = decodeHtmlEntities(
    withoutScripts
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/\n+/g, " ")
      .trim(),
  );

  const links = new Set<string>();
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    if (href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const resolved = new URL(href, base);
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // ignore invalid URLs
    }
  }

  const media: MediaRecord[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    try {
      const resolved = new URL(src, base);
      const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
      media.push({
        url: resolved.toString(),
        type: "image",
        alt: altMatch ? decodeHtmlEntities(altMatch[1]) : undefined,
        source_page: base.toString(),
      });
    } catch {
      // ignore invalid URLs
    }
  }

  return {
    title,
    text,
    links: Array.from(links),
    media,
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '\"')
    .replace(/&#39;/gi, "'");
}

function redactPii(text: string): string {
  if (!text) {
    return text;
  }
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?\d[\d()\s.-]{6,}\d/g, "[REDACTED_PHONE]");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type { CrawlLogEntry, MediaRecord, ScrapeStats, TextCorpusRecord };
