// node gh-seal.js <base64-pubkey-file> <value-file> -> prints base64 sealed box
import { readFileSync } from "node:fs";
import sodium from "libsodium-wrappers";
await sodium.ready;
const pub = Buffer.from(readFileSync(process.argv[2], "utf8").trim(), "base64");
const val = readFileSync(process.argv[3], "utf8").replace(/\r\n$/, "").replace(/\n$/, "");
console.log(Buffer.from(sodium.crypto_box_seal(new Uint8Array(Buffer.from(val, "utf8")), new Uint8Array(pub))).toString("base64"));
