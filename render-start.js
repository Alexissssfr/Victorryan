const { execSync } = require("child_process");
const path = require("path");

try {
  // Change to backend directory and start the server
  process.chdir(path.join(__dirname, "backend"));
  execSync("node server.js", { stdio: "inherit" });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
