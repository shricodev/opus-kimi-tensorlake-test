import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas for AI Fix Runner API validation
// ---------------------------------------------------------------------------

const MAX_STDIO = 200_000;

export const repoSourceSchema = z.union([
  z.object({
    type: z.literal("fixture"),
    fixtureId: z.string().min(1),
  }),
  z.object({
    type: z.literal("localPath"),
    localPath: z.string().min(1),
  }),
  z.object({
    type: z.literal("upload"),
    uploadId: z.string().min(1),
  }),
]);

export const commandConfigSchema = z.object({
  install: z.array(z.string()).default(["npm", "install"]),
  test: z.array(z.string()).default(["npm", "test"]),
  build: z.array(z.string()).default(["npm", "run", "build"]),
});

export const startRunRequestSchema = z.object({
  source: repoSourceSchema,
  maxAttempts: z.number().int().min(1).max(10).default(3),
  commands: commandConfigSchema,
  runBuildAfterTestsPass: z.boolean().default(false),
});

export const patchEditSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => !p.includes(".."), {
      message: "Path must not contain '..'",
    })
    .refine((p) => !p.startsWith("/"), {
      message: "Path must be relative",
    }),
  mode: z.literal("replace_file"),
  content: z.string(),
});

export const patchProposalSchema = z.object({
  kind: z.literal("patch"),
  summary: z.string().min(1),
  edits: z.array(patchEditSchema).min(1),
});

export const noPatchProposalSchema = z.object({
  kind: z.literal("no_patch"),
  message: z.string(),
});

export const patchProposalOrNoneSchema = z.union([
  patchProposalSchema,
  noPatchProposalSchema,
]);

export const commandResultSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number(),
  exitCode: z.number().nullable(),
  signal: z.string().nullable(),
  stdout: z.string().max(MAX_STDIO),
  stderr: z.string().max(MAX_STDIO),
  timedOut: z.boolean(),
  success: z.boolean(),
});

export type RepoSourceInput = z.infer<typeof repoSourceSchema>;
export type StartRunRequestInput = z.infer<typeof startRunRequestSchema>;
export type PatchProposalInput = z.infer<typeof patchProposalSchema>;
export type PatchEditInput = z.infer<typeof patchEditSchema>;
