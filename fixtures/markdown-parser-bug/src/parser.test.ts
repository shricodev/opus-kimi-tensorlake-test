import { describe, it, expect } from "vitest";
import { parseMarkdown } from "./parser.js";

describe("parseMarkdown", () => {
  it("parses h1 headings", () => {
    expect(parseMarkdown("# Hello")).toBe("<h1>Hello</h1>");
  });

  it("parses paragraphs", () => {
    expect(parseMarkdown("Hello world")).toBe("<p>Hello world</p>");
  });

  it("parses unordered lists", () => {
    expect(parseMarkdown("- First\n- Second")).toBe(
      "<ul><li>First</li><li>Second</li></ul>"
    );
  });

  it("does not treat sentence hyphen as list marker", () => {
    expect(parseMarkdown("The well-known solution")).toBe(
      "<p>The well-known solution</p>"
    );
  });

  it("preserves fenced code block content", () => {
    const md = "```\nconst x = 1;\n```";
    expect(parseMarkdown(md)).toBe("<pre><code>const x = 1;</code></pre>");
  });

  it("closes list before paragraph", () => {
    expect(parseMarkdown("- Item\n\nParagraph")).toBe(
      "<ul><li>Item</li></ul><p>Paragraph</p>"
    );
  });

  it("handles blank lines", () => {
    expect(parseMarkdown("First\n\nSecond")).toBe(
      "<p>First</p><p>Second</p>"
    );
  });

  it("wraps list groups in ul", () => {
    expect(parseMarkdown("- A\n- B\n- C")).toBe(
      "<ul><li>A</li><li>B</li><li>C</li></ul>"
    );
  });
});
