import { execFileSync } from "node:child_process";
import process from "node:process";

const port = Number.parseInt(process.argv[2] ?? "5173", 10);

const run = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const getWindowsListenerPids = () => {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  return unique(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
      .map((line) => line.split(/\s+/).at(-1)),
  );
};

const getUnixListenerPids = () => {
  const output = run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
  return unique(output.split(/\r?\n/).map((line) => line.trim()));
};

const killPid = (pid) => {
  if (process.platform === "win32") {
    run("taskkill", ["/PID", pid, "/F"]);
    return;
  }

  run("kill", ["-9", pid]);
};

const pids = process.platform === "win32" ? getWindowsListenerPids() : getUnixListenerPids();

for (const pid of pids) {
  if (pid !== String(process.pid)) {
    killPid(pid);
  }
}
