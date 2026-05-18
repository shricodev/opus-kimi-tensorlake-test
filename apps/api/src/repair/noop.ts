import type {
  RepairEngine,
  RepairInput,
  PatchProposalOrNone,
} from "./interface.js";

export class NoopRepairEngine implements RepairEngine {
  async proposePatch(_input: RepairInput): Promise<PatchProposalOrNone> {
    return {
      kind: "no_patch",
      message:
        "No real LLM repair engine is configured for custom repos in Test 1.",
    };
  }
}
