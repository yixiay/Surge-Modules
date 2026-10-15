const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const modulePath = path.join(
  root,
  "modules/network-diagnostics/ippure/ippure.sgmodule"
);
const scriptPath = path.join(
  root,
  "modules/network-diagnostics/ippure/ippure_panel.js"
);

const defaultGroup = "✈️ 我的节点（所有订阅）";

function runPanel({ argument, decisions = {}, payload = {} } = {}) {
  const source = fs.readFileSync(scriptPath, "utf8");

  return new Promise((resolve, reject) => {
    let requestOptions;
    const timeout = setTimeout(
      () => reject(new Error("panel script did not call $done")),
      1000
    );

    const sandbox = {
      $argument: argument,
      $environment: { language: "zh-Hans" },
      $surge: { selectGroupDetails: () => ({ decisions }) },
      $httpClient: {
        get(options, callback) {
          requestOptions = options;
          callback(null, { status: 200 }, JSON.stringify(payload));
        },
      },
      $done(result) {
        clearTimeout(timeout);
        resolve({ requestOptions, result });
      },
      console,
    };

    vm.runInNewContext(source, sandbox, { filename: scriptPath });
  });
}

test("module declares an editable policy_group parameter for Mac and iOS", () => {
  const moduleText = fs.readFileSync(modulePath, "utf8");
  assert.match(
    moduleText,
    new RegExp(`^#!arguments=policy_group:${defaultGroup}$`, "m")
  );
  assert.match(moduleText, /argument="\{\{\{policy_group\}\}\}"/);
  assert.match(moduleText, /^#!author=Antigravity$/m);
  assert.match(moduleText, /script-path=https:\/\/raw\.githubusercontent\.com\/yixiay\/Surge-Modules\/main\/modules\/network-diagnostics\/ippure\/ippure_panel\.js/);
});

test("uses the configured group and its current selected node", async () => {
  const { requestOptions, result } = await runPanel({
    argument: "OpenAI",
    decisions: { OpenAI: "🇺🇸 美国 01" },
    payload: {
      fraudScore: 12,
      isResidential: true,
      isBroadcast: false,
      city: "Los Angeles",
    },
  });

  assert.equal(requestOptions.policy, "🇺🇸 美国 01");
  assert.match(result.content, /^🇺🇸 美国 01/m);
  assert.match(result.content, /纯净度: 88%/);
  assert.match(result.content, /住宅·原生/);
});

test("falls back to the requested default group for empty input", async () => {
  const { requestOptions } = await runPanel({
    argument: "   ",
    decisions: { [defaultGroup]: "🇭🇰 香港 01" },
    payload: { fraudScore: 0 },
  });

  assert.equal(requestOptions.policy, "🇭🇰 香港 01");
});

test("falls back when an older client leaves the placeholder unresolved", async () => {
  const { requestOptions } = await runPanel({
    argument: "{{{policy_group}}}",
    decisions: { [defaultGroup]: "🇸🇬 新加坡 01" },
    payload: { fraudScore: 0 },
  });

  assert.equal(requestOptions.policy, "🇸🇬 新加坡 01");
});

test("uses the group itself when no selected-node decision is available", async () => {
  const { requestOptions } = await runPanel({
    argument: "OpenAI",
    payload: { fraudScore: 0 },
  });

  assert.equal(requestOptions.policy, "OpenAI");
});

