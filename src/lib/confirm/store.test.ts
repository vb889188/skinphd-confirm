import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "./crypto.ts";

test("sign codes hash to a comparable digest", async () => {
  const code = "246810";
  assert.equal(await sha256Hex(code), await sha256Hex("246810"));
  assert.notEqual(await sha256Hex(code), await sha256Hex("000000"));
});
