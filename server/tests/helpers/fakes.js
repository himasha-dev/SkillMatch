// Test doubles for the Mongoose models, so route handlers can be exercised
// over HTTP without a running MongoDB. Integration tests use a real database.
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../../src/models.js";

export const oid = () => new mongoose.Types.ObjectId();

// A Mongoose-like query: every chain method (populate/sort/select/...) returns
// the same object, and awaiting it resolves to `value`. Calls are recorded.
export function query(value) {
  const calls = [];
  const q = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve(value).then(res, rej);
        if (prop === "calls") return calls;
        return (...args) => {
          calls.push([prop, ...args]);
          return q;
        };
      },
    },
  );
  return q;
}

export const users = {
  student: { _id: oid(), name: "Sam Student", email: "sam@test.lk", role: "student" },
  company: { _id: oid(), name: "Cora Company", email: "hr@acme.lk", role: "company", organization: "Acme" },
  company2: { _id: oid(), name: "Other Co", email: "hr@other.lk", role: "company", organization: "Other" },
  admin: { _id: oid(), name: "Ada Admin", email: "admin@test.lk", role: "admin" },
};

export const tokenFor = (u, opts = {}) =>
  jwt.sign({ id: u._id, role: u.role }, opts.secret || process.env.JWT_SECRET, {
    expiresIn: opts.expiresIn || "1h",
  });

// Make the auth middleware resolve the token's user id to one of `users`.
export function stubAuthUsers() {
  const all = Object.values(users);
  return mock.method(User, "findById", (id) =>
    query(all.find((u) => String(u._id) === String(id)) || null),
  );
}

export const stub = (Model, method, impl) =>
  mock.method(Model, method, typeof impl === "function" ? impl : () => query(impl));

export const restore = () => mock.restoreAll();
