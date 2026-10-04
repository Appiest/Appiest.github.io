const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ENTITIES[character]);
}

export function joinHtml(parts) {
  return parts.filter(Boolean).join("\n");
}

const ICON_PATHS = {
  arrowLeft: "M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z",
  arrowRight: "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z",
  arrowUpRight: "M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z",
  caretRight: "M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z",
};

export function icon(name, className) {
  return `<svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor" class="${className}"><path d="${ICON_PATHS[name]}"/></svg>`;
}

export function originMark(className = "") {
  return `<span aria-hidden="true" class="relative inline-grid size-4 shrink-0 place-items-center ${className}"><span class="absolute inset-0 rounded-full bg-glow/20 blur-[3px]"></span><span class="size-1.5 rounded-full bg-glow shadow-[0_0_12px_2px] shadow-glow/60"></span></span>`;
}

export function pageShell({ title, description, body }) {
  return `<!doctype html>
<html lang="en" class="antialiased">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d1117">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/papers/assets/fonts/hanken-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/papers/assets/papers.css">
</head>
<body class="min-h-dvh bg-surface font-sans text-text">
${body}
</body>
</html>
`;
}
