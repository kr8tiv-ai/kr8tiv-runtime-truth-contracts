console.log("platform:", process.platform);
console.log("arch:", process.arch);
console.log("version:", process.version);
try {
  require("better-sqlite3");
  console.log("better-sqlite3: OK");
} catch(e) {
  console.log("better-sqlite3: FAIL -", e.message.substring(0, 200));
}
