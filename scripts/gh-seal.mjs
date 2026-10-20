// node gh-seal.mjs <base64-pubkey> <value> -> base64 sealed box
import sodium from "libsodium-wrappers";
await sodium.ready;
const pub = Buffer.from(process.argv[2], "base64");
if (pub.length !== 32) throw new Error(`bad pubkey length ${pub.length}`);
const val = Buffer.from(process.argv[3], "utf8");
console.log(Buffer.from(sodium.crypto_box_seal(new Uint8Array(val), new Uint8Array(pub))).toString("base64"));
