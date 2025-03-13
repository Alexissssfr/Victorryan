const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "backend", "server.js");
const server = spawn("node", [serverPath], { stdio: "inherit" });

server.on("error", (err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
