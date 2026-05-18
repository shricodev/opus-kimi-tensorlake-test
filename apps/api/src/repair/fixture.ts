import type { RepairEngine, RepairInput, PatchProposalOrNone } from "./interface.js";

// Correct implementation for invoice-calculator-bug
const INVOICE_CALCULATOR_FIXED = `export interface LineItem {
  quantity: number;
  unitPrice: number;
  description: string;
}

export interface InvoiceResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  lineItems: { description: string; lineTotal: number }[];
}

export function calculateInvoice(
  items: LineItem[],
  discount: number,
  taxRate: number
): InvoiceResult {
  if (discount < 0 || discount > 1) {
    throw new Error("Discount must be between 0 and 1");
  }
  if (taxRate < 0) {
    throw new Error("Tax rate must be non-negative");
  }

  let subtotal = 0;
  const lineItems: { description: string; lineTotal: number }[] = [];

  for (const item of items) {
    if (item.quantity < 0) {
      throw new Error("Quantity must be non-negative");
    }
    if (item.unitPrice < 0) {
      throw new Error("Price must be non-negative");
    }
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;
    lineItems.push({ description: item.description, lineTotal });
  }

  const discountAmount = subtotal * discount;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * taxRate;
  const total = Number((afterDiscount + taxAmount).toFixed(2));

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    lineItems,
  };
}
`;

// Correct implementation for markdown-parser-bug
// We use string concatenation to avoid backtick issues in template literals
const MARKDOWN_PARSER_FIXED = [
  'export function parseMarkdown(input: string): string {',
  '  const lines = input.split("\\n");',
  '  let html = "";',
  '  let inList = false;',
  '  let inCodeBlock = false;',
  '  let codeContent = "";',
  '',
  '  for (let i = 0; i < lines.length; i++) {',
  '    const line = lines[i];',
  '',
  '    if (line.startsWith("\\x60\\x60\\x60")) {',
  '      if (inCodeBlock) {',
  '        html += "<pre><code>" + escapeHtml(codeContent.trimEnd()) + "</code></pre>";',
  '        codeContent = "";',
  '        inCodeBlock = false;',
  '      } else {',
  '        inCodeBlock = true;',
  '      }',
  '      continue;',
  '    }',
  '',
  '    if (inCodeBlock) {',
  '      codeContent += line + "\\n";',
  '      continue;',
  '    }',
  '',
  '    if (line.startsWith("- ")) {',
  '      if (!inList) {',
  '        html += "<ul>";',
  '        inList = true;',
  '      }',
  '      const content = line.slice(2);',
  '      html += "<li>" + escapeHtml(content) + "</li>";',
  '      continue;',
  '    }',
  '',
  '    if (inList) {',
  '      html += "</ul>";',
  '      inList = false;',
  '    }',
  '',
  '    if (line.startsWith("# ")) {',
  '      html += "<h1>" + escapeHtml(line.slice(2)) + "</h1>";',
  '    } else if (line.trim() === "") {',
  '      // blank line',
  '    } else {',
  '      html += "<p>" + escapeHtml(line) + "</p>";',
  '    }',
  '  }',
  '',
  '  if (inList) {',
  '    html += "</ul>";',
  '  }',
  '  if (inCodeBlock) {',
  '    html += "<pre><code>" + escapeHtml(codeContent.trimEnd()) + "</code></pre>";',
  '  }',
  '',
  '  return html;',
  '}',
  '',
  'function escapeHtml(text: string): string {',
  '  return text',
  '    .replace(/&/g, "&amp;")',
  '    .replace(/</g, "&lt;")',
  '    .replace(/>/g, "&gt;");',
  '}',
  '',
].join("\n");

// Correct implementation for todo-api-bug
const TODO_API_FIXED = `import express, { Request, Response } from "express";

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

let todos: Todo[] = [];
let nextId = 1;

export function createApp() {
  // Reset module-level state for fresh test runs
  todos = [];
  nextId = 1;

  const app = express();
  app.use(express.json());

  app.get("/todos", (_req: Request, res: Response) => {
    res.json(todos);
  });

  app.post("/todos", (req: Request, res: Response) => {
    const { title } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const todo: Todo = {
      id: nextId++,
      title,
      completed: false,
    };
    todos.push(todo);
    res.status(201).json(todo);
  });

  app.patch("/todos/:id", (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const todo = todos.find((t) => t.id === id);

    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    const { completed } = req.body;

    if (completed !== undefined && typeof completed !== "boolean") {
      res.status(400).json({ error: "Completed must be a boolean" });
      return;
    }

    if (completed !== undefined) {
      todo.completed = completed;
    }

    res.json(todo);
  });

  app.delete("/todos", (_req: Request, res: Response) => {
    todos = [];
    nextId = 1;
    res.status(204).send();
  });

  return app;
}
`;

export class FixtureRepairEngine implements RepairEngine {
  async proposePatch(input: RepairInput): Promise<PatchProposalOrNone> {
    const { fixtureId, attemptNumber } = input;

    if (attemptNumber > 1) {
      return {
        kind: "no_patch",
        message: `No additional patch available for ${fixtureId} on attempt ${attemptNumber}.`,
      };
    }

    switch (fixtureId) {
      case "invoice-calculator-bug":
        return {
          kind: "patch",
          summary: "Fix invoice calculation: apply discount before tax, round only final total, add input validation.",
          edits: [
            {
              path: "src/calculateInvoice.ts",
              mode: "replace_file",
              content: INVOICE_CALCULATOR_FIXED,
            },
          ],
        };

      case "markdown-parser-bug":
        return {
          kind: "patch",
          summary: "Fix markdown parser: only treat lines starting with '- ' as list items, properly handle fenced code blocks.",
          edits: [
            {
              path: "src/parser.ts",
              mode: "replace_file",
              content: MARKDOWN_PARSER_FIXED,
            },
          ],
        };

      case "todo-api-bug":
        return {
          kind: "patch",
          summary: "Fix todo API: validate completed type, return updated todo after PATCH, reject empty title.",
          edits: [
            {
              path: "src/app.ts",
              mode: "replace_file",
              content: TODO_API_FIXED,
            },
          ],
        };

      default:
        return {
          kind: "no_patch",
          message: `Unknown fixture: ${fixtureId}`,
        };
    }
  }
}
