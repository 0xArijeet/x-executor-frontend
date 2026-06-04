import { afterEach, beforeEach, expect, test } from "bun:test";
import { clearToken, getToken, setToken } from "./storage";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

afterEach(() => {
  clearToken();
});

test("token storage round-trip", () => {
  expect(getToken()).toBeNull();
  setToken("test-jwt");
  expect(getToken()).toBe("test-jwt");
  clearToken();
  expect(getToken()).toBeNull();
});
