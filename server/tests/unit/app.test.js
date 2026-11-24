// createApp() configuration
import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../src/app.js";

describe("createApp", () => {
  it("UT-APP-01 without CLIENT_URL the API allows the Vite dev origin http://localhost:5173", async () => {
    const saved = process.env.CLIENT_URL;
    delete process.env.CLIENT_URL;
    const app = createApp();
    process.env.CLIENT_URL = saved;
    const server = await new Promise((r) => {
      const s = app.listen(0, "127.0.0.1", () => r(s));
    });
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, { headers: { Origin: "http://localhost:5173" } });
      assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
    } finally {
      server.close();
    }
  });
});
