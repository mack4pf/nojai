import CryptoJS from "crypto-js";

export function encryptIqPassword(password: string) {
  const secret =
    process.env.NEXT_PUBLIC_IQ_PASSWORD_SECRET ?? "nojai-iq-password-secret";
  const key = CryptoJS.enc.Hex.parse(CryptoJS.SHA256(secret).toString());
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(password, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.stringify({
    iv: CryptoJS.enc.Base64.stringify(iv),
    value: encrypted.toString(),
  });
}