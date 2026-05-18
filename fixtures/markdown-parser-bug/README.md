# Markdown Parser Bug

A tiny markdown-to-HTML parser supporting headings, paragraphs, unordered lists, and code blocks.

## Bug

The parser has two issues:
1. It incorrectly treats hyphens inside normal sentences as list items (any line containing `-` becomes a list item)
2. It breaks fenced code blocks (```) – they are not properly detected or preserved

## Correct behavior

- `# Hello` becomes `<h1>Hello</h1>`
- Normal text becomes `<p>...</p>`
- Lines starting with `- ` become unordered list items wrapped in `<ul>...</ul>`
- Hyphens inside sentences should NOT create lists
- Fenced code blocks using ` ``` ` should preserve content
- Blank lines separate paragraphs
- List groups should be wrapped in `<ul>...</ul>`

## Files

- `src/parser.ts` – buggy implementation
- `src/parser.test.ts` – tests

## Running tests

```bash
npm install
npm test
```
