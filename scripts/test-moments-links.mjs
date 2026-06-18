const urls = [
  "https://www.instagram.com/reel/DZkVAiYoE8M/",
  "https://www.instagram.com/reel/DZe4zVFJ2oj/",
  "https://www.instagram.com/reel/DZW7qw3N54a/",
];

async function ogFromReel(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  const html = await res.text();
  const img =
    html.match(/property="og:image" content="([^"]+)"/)?.[1] ??
    html.match(/content="([^"]+)" property="og:image"/)?.[1];
  const title =
    html.match(/property="og:title" content="([^"]+)"/)?.[1] ??
    html.match(/content="([^"]+)" property="og:title"/)?.[1];
  return { status: res.status, img: img?.slice(0, 80), title: title?.slice(0, 60) };
}

async function youtubeChannel() {
  const res = await fetch("https://www.youtube.com/@NTGLounge", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const patterns = [
    /"externalId":"(UC[^"]+)"/,
    /"channelId":"(UC[^"]+)"/,
    /"browseId":"(UC[^"]+)"/,
    /youtube\.com\/channel\/(UC[\w-]+)/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return { pattern: p.source, id: m[1] };
  }
  return { pattern: null, id: null, len: html.length };
}

console.log("=== Instagram OG scrape ===");
for (const url of urls) {
  console.log(url, await ogFromReel(url));
}
console.log("\n=== YouTube ===");
console.log(await youtubeChannel());
