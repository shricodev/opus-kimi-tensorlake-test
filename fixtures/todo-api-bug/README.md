# Todo API Bug

A tiny Express API for managing todos.

## Bug

The PATCH endpoint has two issues:
1. It returns the stale todo object BEFORE applying the update (so the response doesn't reflect the change)
2. It does not validate the `completed` field type (accepts strings, numbers, etc.)
3. It also does not reject empty titles on POST

## Correct behavior

- `POST /todos` creates a todo with id, title, completed: false
- `GET /todos` returns all todos
- `PATCH /todos/:id` updates `completed` and returns the updated todo
- `PATCH` with invalid `completed` value returns 400
- `PATCH` unknown todo returns 404
- Empty title returns 400

## Files

- `src/app.ts` – buggy implementation
- `src/server.ts` – entry point
- `src/app.test.ts` – tests

## Running tests

```bash
npm install
npm test
```
