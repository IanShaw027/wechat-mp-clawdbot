import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildEncryptedReply, decryptWechatMessage, encryptWechatMessage, verifyMessageSignature, verifySignature } from "../src/crypto.js";

test("verifySignature works with sorted token/timestamp/nonce", () => {
  const token = "token-x";
  const timestamp = "1733990400";
  const nonce = "abcdef";
  const hash = createHash("sha1").update([token, timestamp, nonce].sort().join("")).digest("hex");
  assert.equal(verifySignature(hash, timestamp, nonce, token), true);
});

test("encryptWechatMessage and decryptWechatMessage roundtrip", () => {
  const aesKey = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
  const appId = "wx_test_app_id";
  const xml = "<xml><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[hello]]></Content></xml>";
  const encrypted = encryptWechatMessage(xml, aesKey, appId);
  const decrypted = decryptWechatMessage(encrypted, aesKey, appId);
  assert.equal(decrypted, xml);
});

test("buildEncryptedReply generates signature verifiable by verifyMessageSignature", () => {
  const token = "token-x";
  const aesKey = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
  const appId = "wx_test_app_id";
  const timestamp = "1733990400";
  const nonce = "abcdef";
  const xml = "<xml><Content><![CDATA[test]]></Content></xml>";

  const reply = buildEncryptedReply({ xml, token, encodingAESKey: aesKey, appId, timestamp, nonce });
  const encrypted = /<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s.exec(reply)?.[1] || "";
  const signature = /<MsgSignature><!\[CDATA\[(.*?)\]\]><\/MsgSignature>/s.exec(reply)?.[1] || "";
  assert.ok(encrypted.length > 0);
  assert.ok(signature.length > 0);
  assert.equal(verifyMessageSignature(signature, timestamp, nonce, encrypted, token), true);
});
