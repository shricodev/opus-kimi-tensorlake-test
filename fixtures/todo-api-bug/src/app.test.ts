import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("Todo API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("creates a todo", async () => {
    const res = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: "Buy milk", completed: false });
  });

  it("lists todos", async () => {
    await request(app).post("/todos").send({ title: "A" });
    await request(app).post("/todos").send({ title: "B" });
    const res = await request(app).get("/todos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("updates completed status", async () => {
    await request(app).post("/todos").send({ title: "Task" });
    const res = await request(app)
      .patch("/todos/1")
      .send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it("returns the updated todo", async () => {
    await request(app).post("/todos").send({ title: "Task" });
    const res = await request(app)
      .patch("/todos/1")
      .send({ completed: true });
    expect(res.body).toMatchObject({ id: 1, title: "Task", completed: true });
  });

  it("rejects invalid completed type", async () => {
    await request(app).post("/todos").send({ title: "Task" });
    const res = await request(app)
      .patch("/todos/1")
      .send({ completed: "yes" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing todo", async () => {
    const res = await request(app)
      .patch("/todos/999")
      .send({ completed: true });
    expect(res.status).toBe(404);
  });

  it("rejects empty title", async () => {
    const res = await request(app).post("/todos").send({ title: "" });
    expect(res.status).toBe(400);
  });
});
