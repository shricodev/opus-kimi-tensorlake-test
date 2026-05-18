import { Router } from "express";

const router = Router();

const FIXTURES = [
  {
    id: "invoice-calculator-bug",
    name: "Invoice Calculator Bug",
    description:
      "A small invoice calculator that applies tax before discount, rounds early, and lacks input validation.",
    language: "TypeScript",
    defaultCommands: {
      install: ["npm", "install"],
      test: ["npm", "test"],
      build: ["npm", "run", "build"],
    },
  },
  {
    id: "markdown-parser-bug",
    name: "Markdown Parser Bug",
    description:
      "A markdown-to-HTML parser that incorrectly treats sentence hyphens as list items and breaks fenced code blocks.",
    language: "TypeScript",
    defaultCommands: {
      install: ["npm", "install"],
      test: ["npm", "test"],
      build: ["npm", "run", "build"],
    },
  },
  {
    id: "todo-api-bug",
    name: "Todo API Bug",
    description:
      "A tiny Express API where PATCH returns stale data and does not validate the completed field.",
    language: "TypeScript",
    defaultCommands: {
      install: ["npm", "install"],
      test: ["npm", "test"],
      build: ["npm", "run", "build"],
    },
  },
];

router.get("/api/fixtures", (_req, res) => {
  res.json({ fixtures: FIXTURES });
});

export default router;
