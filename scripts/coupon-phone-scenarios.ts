import assert from "node:assert/strict";
import { normalizeEgPhone, phonesMatch } from "../src/lib/phone";

assert.equal(normalizeEgPhone("01012345678"), "+201012345678");
assert.equal(normalizeEgPhone("+201012345678"), "+201012345678");
assert.equal(normalizeEgPhone("201012345678"), "+201012345678");
assert.ok(phonesMatch("01012345678", "+20 101 234 5678"));
assert.equal(normalizeEgPhone(""), null);
assert.equal(normalizeEgPhone("123"), null);

console.log("Phone normalization scenarios passed");
