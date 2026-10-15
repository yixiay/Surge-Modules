const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");

const surgeCli =
  "/Applications/Surge.app/Contents/Applications/surge-cli";
const modulePath = path.resolve(
  __dirname,
  "../modules/network-diagnostics/ippure/ippure.sgmodule"
);
const uri = pathToFileURL(modulePath).href;
const text = fs.readFileSync(modulePath, "utf8");

const child = spawn(surgeCli, ["lsp", "--stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});

function send(message) {
  const body = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

let buffer = Buffer.alloc(0);
let opened = false;
let finished = false;

function finish(code, diagnostics = []) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  send({ jsonrpc: "2.0", method: "shutdown", id: 2 });
  child.stdin.end();

  if (diagnostics.length) {
    for (const item of diagnostics) {
      const line = Number(item.range?.start?.line || 0) + 1;
      console.error(`${modulePath}:${line}: ${item.message}`);
    }
  } else {
    console.log(`Surge module diagnostics: clean (${modulePath})`);
  }
  process.exitCode = code;
}

function handle(message) {
  if (message.id === 1 && !opened) {
    opened = true;
    send({ jsonrpc: "2.0", method: "initialized", params: {} });
    send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "surge-module",
          version: 1,
          text,
        },
      },
    });
    return;
  }

  if (
    message.method === "textDocument/publishDiagnostics" &&
    message.params?.uri === uri
  ) {
    const diagnostics = message.params.diagnostics || [];
    const errors = diagnostics.filter((item) => item.severity === 1);
    finish(errors.length ? 1 : 0, errors);
  }
}

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      finish(1, [{ message: "Invalid LSP response header" }]);
      return;
    }

    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + length) return;
    const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
    buffer = buffer.subarray(bodyStart + length);
    handle(JSON.parse(body));
  }
});

child.on("error", (error) => {
  finish(1, [{ message: `Unable to start Surge LSP: ${error.message}` }]);
});

const timer = setTimeout(() => {
  finish(1, [{ message: "Timed out waiting for Surge module diagnostics" }]);
}, 5000);

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    processId: process.pid,
    rootUri: pathToFileURL(path.resolve(__dirname, "..")).href,
    capabilities: {},
  },
});
