"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const file = process.argv[2] ? path.resolve(process.argv[2]) : "";

if (!file || !fs.existsSync(file)) {
  console.error("Использование: node tools/restore-network-backup.js <путь-к-backup.json>");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Введите пароль резервной копии: ", (password) => {
  try {
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    if (backup.format !== "fibrochat-encrypted-network-backup" || backup.version !== 1) throw new Error("Неверный формат резервной копии");
    const e = backup.encryption || {};
    const salt = Buffer.from(e.salt, "base64");
    const iv = Buffer.from(e.iv, "base64");
    const tag = Buffer.from(e.tag, "base64");
    const key = crypto.scryptSync(password, salt, 32, { N: Number(e.N) || 16384, r: Number(e.r) || 8, p: Number(e.p) || 1 });
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(backup.ciphertext, "base64")), decipher.final()]);
    const snapshot = JSON.parse(plaintext.toString("utf8"));
    if (snapshot.format !== "fibrochat-network-snapshot" || snapshot.version !== 1 || !snapshot.network || !snapshot.data) throw new Error("Повреждённое содержимое резервной копии");

    fs.mkdirSync(DATA, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safety = path.join(ROOT, `data-before-restore-${stamp}`);
    if (fs.existsSync(DATA)) fs.cpSync(DATA, safety, { recursive: true });

    const mapping = {
      users: "users.json", invites: "invites.json", messages: "messages.json", audit: "audit.json",
      notifications: "notifications.json", support: "support.json", devices: "devices.json", sessions: "sessions.json"
    };
    for (const [keyName, fileName] of Object.entries(mapping)) {
      const value = Array.isArray(snapshot.data[keyName]) ? snapshot.data[keyName] : [];
      fs.writeFileSync(path.join(DATA, fileName), JSON.stringify(value, null, 2) + "\n", "utf8");
    }
    fs.writeFileSync(path.join(DATA, "network.json"), JSON.stringify(snapshot.network, null, 2) + "\n", "utf8");
    console.log(`Восстановление завершено. Предыдущие данные сохранены в: ${safety}`);
    console.log("Теперь запустите: npm start");
  } catch (error) {
    console.error(`Ошибка восстановления: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
});
