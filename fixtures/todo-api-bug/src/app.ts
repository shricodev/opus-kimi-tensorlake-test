import express, { Request, Response } from "express";

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

let todos: Todo[] = [];
let nextId = 1;

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/todos", (_req: Request, res: Response) => {
    res.json(todos);
  });

  app.post("/todos", (req: Request, res: Response) => {
    const { title } = req.body;

    // BUG: missing validation for empty title

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

    // BUG: does not validate `completed` type (accepts strings, numbers, etc.)
    // BUG: returns the stale todo object before applying the update
    const updatedTodo = { ...todo };

    if (completed !== undefined) {
      todo.completed = completed;
    }

    res.json(updatedTodo);
  });

  // helper for tests
  app.delete("/todos", (_req: Request, res: Response) => {
    todos = [];
    nextId = 1;
    res.status(204).send();
  });

  return app;
}
