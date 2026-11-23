import { POCKET_COINS, type PocketCoin } from "@/lib/pockets/coins";

export type SubmitFailure = {
  code:
    | "message_mismatch"
    | "invalid_public_key"
    | "private_key_mismatch"
    | "payload_unreadable"
    | "invalid_request";
  chain?: PocketCoin;
};

/** Only recognized protocol codes leave this boundary; never display returned keys or signed text. */
export function classifySubmitFailure(value: unknown): SubmitFailure {
  if (value === "message mismatch") return { code: "message_mismatch" };
  if (value === "cannot open payload") return { code: "payload_unreadable" };
  if (typeof value === "string") {
    for (const chain of POCKET_COINS) {
      if (value === `bad xpub ${chain}`) return { code: "invalid_public_key", chain };
      if (value === `key mismatch ${chain}`) return { code: "private_key_mismatch", chain };
    }
  }
  return { code: "invalid_request" };
}

export function submitFailureMessage(value: unknown): string {
  const failure = classifySubmitFailure(value);
  switch (failure.code) {
    case "message_mismatch":
      return "The signed text didn't match what Seeds expected. Start again on Seeds.";
    case "invalid_public_key":
      return `Seeds couldn't read the ${failure.chain} public key. Check that Seeds and your signing app are up to date, then start again.`;
    case "private_key_mismatch":
      return `Seeds found that the ${failure.chain} pocket keys don't match. Don't fund this pocket; update your signing app and start again.`;
    case "payload_unreadable":
      return "Seeds couldn't open the encrypted pocket keys. Start a fresh request on Seeds and scan the new request in your signing app.";
    default:
      return "Seeds refused the pocket handoff because the request or keys were invalid. Check that both apps are up to date and start again on Seeds.";
  }
}
