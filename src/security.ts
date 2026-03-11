import type { ResolvedWempAccount } from "./types.js";

export function resolveDmPolicy(account: ResolvedWempAccount) {
  return {
    policy: account.dm.policy,
    allowFrom: account.dm.allowFrom,
    normalizeEntry: (raw: string) => String(raw || "").trim(),
    policyPath: "channels.wemp.dm.policy",
    allowFromPath: "channels.wemp.dm.allowFrom",
  };
}
