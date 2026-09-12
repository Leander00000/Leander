import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");

function harness() {
  const rows = new Map();
  const calls = new Set();
  let count = 0;
  let apiFailure = false;
  let storageFailure = false;
  const key = (values) =>
    `${values.user_id}:${values.task_id}:${values.occurrence}`;
  const supabase = {
    from() {
      let operation = "select",
        payload,
        filters = {};
      const builder = {
        select() {
          return builder;
        },
        eq(name, value) {
          filters[name] = value;
          return builder;
        },
        maybeSingle() {
          return builder;
        },
        insert(value) {
          operation = "insert";
          payload = value;
          return builder;
        },
        update(value) {
          operation = "update";
          payload = value;
          return builder;
        },
        then(resolve, reject) {
          let result;
          if (operation === "insert") {
            const id = key(payload);
            if (rows.has(id)) result = { error: { code: "23505" } };
            else {
              rows.set(id, { ...payload });
              result = { error: null };
            }
          } else if (operation === "update") {
            if (storageFailure) result = { error: { code: "storage-down" } };
            else {
              Object.assign(rows.get(key(filters)), payload);
              result = { error: null };
            }
          } else
            result = {
              data: rows.get(key(filters))
                ? { ...rows.get(key(filters)) }
                : null,
              error: null,
            };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  class TodoistApiError extends Error {}
  const mocks = {
    "node:crypto": require("node:crypto"),
    "next/cache": { revalidatePath() {} },
    "@/lib/date": { getDateKey: () => "2026-09-12" },
    "@/lib/config": { getAppMode: () => "connected" },
    "@/lib/auth": { requireViewer: async () => ({ id: "owner" }) },
    "@/lib/supabase/server": { createClient: async () => supabase },
    "@/lib/data/tasks": { toDashboardTask: (value) => value },
    "@/lib/todoist": {
      TodoistApiError,
      quickAddTask() {},
      getTask: async () => ({
        completed_count: count,
        checked: false,
        is_deleted: false,
      }),
      closeTask: async (_id, uuid) => {
        if (apiFailure) throw new Error("offline");
        if (!calls.has(uuid)) {
          calls.add(uuid);
          count++;
        }
      },
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/app/actions/todoist.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
  });
  return {
    complete: exports.completeTaskAction,
    rows,
    calls,
    failApi: (value) => {
      apiFailure = value;
    },
    failStorage: (value) => {
      storageFailure = value;
    },
  };
}

test("concurrent submissions and retries award a recurring occurrence exactly once", async () => {
  const app = harness();
  const result = await Promise.all([
    app.complete("abc", 0),
    app.complete("abc", 0),
  ]);
  assert.equal(
    result.every((item) => item.ok),
    true,
  );
  assert.equal(app.calls.size, 1);
  assert.equal(app.rows.size, 1);
  assert.equal((await app.complete("abc", 0)).ok, true);
  assert.equal(app.calls.size, 1);
  assert.equal((await app.complete("abc", 1)).ok, true);
  assert.equal(app.calls.size, 2);
});
test("failed Todoist save awards nothing; retry reuses reservation", async () => {
  const app = harness();
  app.failApi(true);
  assert.equal((await app.complete("abc", 0)).ok, false);
  assert.equal([...app.rows.values()][0].status, "pending");
  app.failApi(false);
  assert.equal((await app.complete("abc", 0)).ok, true);
  assert.equal(app.calls.size, 1);
  assert.equal([...app.rows.values()][0].status, "completed");
});
test("database failure after Todoist success does not close the next recurrence on retry", async () => {
  const app = harness();
  app.failStorage(true);
  assert.equal((await app.complete("abc", 0)).ok, false);
  assert.equal(app.calls.size, 1);
  app.failStorage(false);
  assert.equal((await app.complete("abc", 0)).ok, true);
  assert.equal(app.calls.size, 1);
});
test("stale or forged recurrence is rejected before changing Todoist", async () => {
  const app = harness();
  assert.equal((await app.complete("abc", 99)).ok, false);
  assert.equal((await app.complete("abc", -1)).ok, false);
  assert.equal(app.rows.size, 0);
  assert.equal(app.calls.size, 0);
});
