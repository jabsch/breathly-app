// Orders docs/FAQ.md so the most asked questions come first, using the counts in
// docs/faq-asks.json, and rebuilds the table of contents. Ties keep their current order.
// Run with --check to fail instead of writing when the file is out of order.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const faqPath = fileURLToPath(new URL("../../docs/FAQ.md", import.meta.url));
const asksPath = fileURLToPath(new URL("../../docs/faq-asks.json", import.meta.url));

// GitHub's heading anchors: lowercase, drop punctuation, spaces become hyphens.
export const slugify = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");

export const sortFaq = (markdown, asks) => {
  const [head, ...rawSections] = markdown.split(/^(?=## )/m);
  const sections = rawSections.map((text) => {
    const title = text.slice(3, text.indexOf("\n")).trim();
    const slug = slugify(title);
    if (!(slug in asks)) throw new Error(`No ask count in faq-asks.json for "${slug}"`);
    return { title, slug, text: text.trimEnd() };
  });
  const unknown = Object.keys(asks).filter((slug) => !sections.some((s) => s.slug === slug));
  if (unknown.length)
    throw new Error(`faq-asks.json lists missing questions: ${unknown.join(", ")}`);

  const ordered = sections
    .map((section, index) => ({ ...section, index }))
    .sort((a, b) => asks[b.slug] - asks[a.slug] || a.index - b.index);
  const toc = ordered.map((s) => `- [${s.title}](#${s.slug})`).join("\n");
  const intro = head.replace(/^- \[.*\]\(#.*\)\n?/gm, "").trimEnd();
  return `${intro}\n\n${toc}\n\n${ordered.map((s) => s.text).join("\n\n")}\n`;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const markdown = readFileSync(faqPath, "utf8");
  const { questions } = JSON.parse(readFileSync(asksPath, "utf8"));
  const sorted = sortFaq(markdown, questions);
  if (process.argv.includes("--check")) {
    if (sorted !== markdown) {
      console.error("docs/FAQ.md is out of order. Run: bun run faq:sort");
      process.exit(1);
    }
  } else {
    writeFileSync(faqPath, sorted);
  }
}
