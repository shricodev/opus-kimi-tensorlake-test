export function parseMarkdown(input: string): string {
  const lines = input.split("\n");
  let html = "";
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // BUG: Any line containing a hyphen is treated as a list item
    // This incorrectly treats "well-known" inside a sentence as a list marker
    if (line.includes("-")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      // BUG: just split on the first '-' which can have empty content
      const parts = line.split("-");
      const content = parts.slice(1).join("-").trim();
      html += `<li>${escapeHtml(content)}</li>`;
      continue;
    }

    // BUG: list is NOT closed here before paragraph, leaving <ul> open
    // The closing </ul> only happens at the very end of the document

    if (line.startsWith("# ")) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
    } else if (line.trim() === "") {
      // BUG: blank lines are silently eaten inside lists / paragraphs
    } else {
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  // BUG: only closes list at end of document
  if (inList) {
    html += "</ul>";
  }

  // BUG: fenced code blocks (```) are completely ignored and treated as normal text

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
