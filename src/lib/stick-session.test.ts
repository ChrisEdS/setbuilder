import assert from "node:assert/strict";
import test from "node:test";
import {
  isPickerBlocked,
  isPickerCancel,
  pickerFailureKind,
  pickAndRememberStick,
  stickPicker,
} from "./stick-session.ts";

test("stickPicker does not touch window on the server", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(stickPicker(), null);
});

test("isPickerCancel only matches the directory-picker abort", () => {
  assert.equal(isPickerCancel(Object.assign(new Error("cancel"), { name: "AbortError" })), true);
  assert.equal(isPickerCancel(Object.assign(new Error("clone"), { name: "DataCloneError" })), false);
  assert.equal(isPickerCancel(new Error("fail")), false);
});

test("picker AbortError stays silent; blocked and other errors surface", () => {
  const cancel = Object.assign(new Error("cancel"), { name: "AbortError" });
  const blocked = Object.assign(new Error("gesture"), { name: "SecurityError" });
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const other = Object.assign(new Error("boom"), { name: "TypeError" });
  assert.equal(pickerFailureKind(cancel), "cancel");
  assert.equal(isPickerBlocked(blocked), true);
  assert.equal(pickerFailureKind(blocked), "blocked");
  assert.equal(pickerFailureKind(denied), "blocked");
  assert.equal(pickerFailureKind(other), "error");
  assert.equal(isPickerCancel(blocked), false);
});

async function withPicker<T>(
  pick: (() => Promise<unknown>) | undefined,
  indexedDB: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousIdb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: pick ? { showDirectoryPicker: pick } : {},
    writable: true,
  });
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: indexedDB,
    writable: true,
  });
  try {
    return await run();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete (globalThis as { window?: unknown }).window;
    if (previousIdb) Object.defineProperty(globalThis, "indexedDB", previousIdb);
    else delete (globalThis as { indexedDB?: unknown }).indexedDB;
  }
}

function failingIdb(name: string) {
  return {
    open() {
      const request: {
        error: Error;
        onerror: (() => void) | null;
      } = {
        error: Object.assign(new Error(name), { name }),
        onerror: null,
      };
      queueMicrotask(() => request.onerror?.());
      return request;
    },
  };
}

test("pickAndRememberStick returns null when the user cancels the picker", async () => {
  await withPicker(
    async () => {
      throw Object.assign(new Error("cancel"), { name: "AbortError" });
    },
    undefined,
    async () => {
      assert.equal(await pickAndRememberStick("read"), null);
    },
  );
});

test("pickAndRememberStick keeps the handle when persist aborts", async () => {
  const handle = { name: "USB" };
  await withPicker(
    async () => handle,
    failingIdb("AbortError"),
    async () => {
      assert.equal(await pickAndRememberStick("read"), handle);
    },
  );
});

test("pickAndRememberStick keeps the handle when persist cannot clone", async () => {
  const handle = { name: "USB" };
  await withPicker(
    async () => handle,
    failingIdb("DataCloneError"),
    async () => {
      assert.equal(await pickAndRememberStick(), handle);
    },
  );
});

test("IndexedDB abort while remembering a handle still proceeds to read", async () => {
  const handle = { name: "USB" };
  await withPicker(
    async () => handle,
    failingIdb("AbortError"),
    async () => {
      const picked = await pickAndRememberStick("read");
      assert.equal(picked, handle);
      const read = await Promise.resolve(picked).then((root) => ({
        label: root?.name ?? "",
        sets: [{ name: "Set 1" }],
      }));
      assert.equal(read.label, "USB");
      assert.equal(read.sets.length, 1);
    },
  );
});

test("pickAndRememberStick surfaces non-cancel picker errors", async () => {
  await withPicker(
    async () => {
      throw Object.assign(new Error("Must be handling a user gesture"), { name: "SecurityError" });
    },
    undefined,
    async () => {
      await assert.rejects(
        () => pickAndRememberStick("read"),
        (error: unknown) => pickerFailureKind(error) === "blocked",
      );
    },
  );
  await withPicker(
    async () => {
      throw Object.assign(new Error("picker crashed"), { name: "TypeError" });
    },
    undefined,
    async () => {
      await assert.rejects(
        () => pickAndRememberStick("read"),
        (error: unknown) => pickerFailureKind(error) === "error",
      );
    },
  );
});
