// Swamp, an Automation Framework
// Copyright (C) 2026 System Initiative, Inc.
//
// This file is part of Swamp.
//
// Swamp is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation, with the Swamp
// Extension and Definition Exception (found in the "COPYING-EXCEPTION"
// file).
//
// Swamp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with Swamp.  If not, see <https://www.gnu.org/licenses/>.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { initializeLogging } from "../../infrastructure/logging/logger.ts";
import { buildErrorJson, renderError } from "./error_output.ts";
import { UserError } from "../../domain/errors.ts";

await initializeLogging({});

Deno.test("renderError logs UserError message without stack trace", () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    const error = new UserError("Model not found");
    renderError(error);

    assertEquals(logs.length, 1);
    assertStringIncludes(logs[0], "Model not found");
    // Should not contain stack trace lines
    assertEquals(logs[0].includes("    at "), false);
  } finally {
    console.error = originalError;
  }
});

Deno.test("renderError logs non-UserError with error object", () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    const error = new Error("Something broke");
    renderError(error);

    assertEquals(logs.length, 1);
    assertStringIncludes(logs[0], "Something broke");
  } finally {
    console.error = originalError;
  }
});

Deno.test("renderError wraps non-Error values in Error", () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    renderError("plain string error");

    assertEquals(logs.length, 1);
    assertStringIncludes(logs[0], "plain string error");
  } finally {
    console.error = originalError;
  }
});

Deno.test("renderError logs Cliffy missing argument error without stack trace", () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    const error = new Error("Missing argument(s): extension");
    renderError(error);

    assertEquals(logs.length, 1);
    assertStringIncludes(logs[0], "Missing argument(s): extension");
    // Should not contain stack trace lines
    assertEquals(logs[0].includes("    at "), false);
  } finally {
    console.error = originalError;
  }
});

Deno.test("renderError uses fatal level for all errors", () => {
  const logs: string[] = [];
  const originalError = console.error;
  // LogTape's console sink uses console.error for fatal level
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    renderError(new UserError("user error"));
    renderError(new Error("system error"));

    // Both should have logged (fatal goes to console.error)
    assertEquals(logs.length, 2);
  } finally {
    console.error = originalError;
  }
});

// ============================================================================
// JSON stdout output tests
// ============================================================================

Deno.test("renderError: json mode writes error JSON to stdout", () => {
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => stdoutLogs.push(args.join(" "));
  console.error = (...args: unknown[]) => stderrLogs.push(args.join(" "));

  try {
    renderError(new UserError("Model not found"), "json");

    assertEquals(stdoutLogs.length, 1);
    const parsed = JSON.parse(stdoutLogs[0]);
    assertEquals(parsed.error, "Model not found");
    assertEquals(parsed.stack, undefined);
    // stderr should also get the error (via LogTape)
    assertEquals(stderrLogs.length, 1);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("renderError: log mode does not write to stdout", () => {
  const stdoutLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => stdoutLogs.push(args.join(" "));
  console.error = () => {};

  try {
    renderError(new UserError("Model not found"), "log");

    assertEquals(stdoutLogs.length, 0);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("renderError: no outputMode does not write to stdout", () => {
  const stdoutLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => stdoutLogs.push(args.join(" "));
  console.error = () => {};

  try {
    renderError(new UserError("Model not found"));

    assertEquals(stdoutLogs.length, 0);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

// ============================================================================
// buildErrorJson tests
// ============================================================================

Deno.test("buildErrorJson: UserError produces error-only JSON", () => {
  const result = buildErrorJson(new UserError("Not found"));
  assertEquals(result.error, "Not found");
  assertEquals(result.stack, undefined);
});

Deno.test("buildErrorJson: system Error includes stack", () => {
  const result = buildErrorJson(new Error("Something broke"));
  assertEquals(result.error, "Something broke");
  assertEquals(typeof result.stack, "string");
  assertStringIncludes(result.stack!, "at ");
});

Deno.test("buildErrorJson: Cliffy missing arg error has no stack", () => {
  const result = buildErrorJson(new Error("Missing argument(s): extension"));
  assertEquals(result.error, "Missing argument(s): extension");
  assertEquals(result.stack, undefined);
});
