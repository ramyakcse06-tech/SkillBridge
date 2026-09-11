import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface ExecutionResult {
  success: boolean;
  passed: boolean;
  status: string;
  message: string;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  output?: string;
}

function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseInputOutput(
  inputOutput: any
): TestCase[] {

  if (!inputOutput) {
    return [];
  }

  // TACO may store input_output as a
  // JSON-encoded string.
  if (typeof inputOutput === "string") {

    try {
      inputOutput = JSON.parse(inputOutput);
    } catch (error) {

      console.error(
        "Failed to parse input_output:",
        error
      );

      return [];
    }
  }

  if (
    !inputOutput ||
    typeof inputOutput !== "object"
  ) {
    return [];
  }

  if (
    !Array.isArray(inputOutput.inputs) ||
    !Array.isArray(inputOutput.outputs)
  ) {
    return [];
  }

  const count = Math.min(
    inputOutput.inputs.length,
    inputOutput.outputs.length
  );

  if (count === 0) {
    return [];
  }

  const testCases: TestCase[] = [];

  for (let i = 0; i < count; i++) {

    const input =
      inputOutput.inputs[i];

    const expected =
      inputOutput.outputs[i];

    testCases.push({
      input:
        typeof input === "string"
          ? input
          : String(input),

      expectedOutput:
        typeof expected === "string"
          ? expected
          : String(expected),
    });
  }

  return testCases;
}

function runProcess(
  executablePath: string,
  input: string,
  timeoutMs: number
): Promise<{
  status: string;
  output: string;
  executionTimeMs: number;
}> {

  return new Promise((resolve) => {

    const start = Date.now();

    const child = spawn(
      executablePath,
      [],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    let finished = false;

    const finish = (
      status: string
    ) => {

      if (finished) {
        return;
      }

      finished = true;

      resolve({
        status,
        output:
          stdout.length > 0
            ? stdout
            : stderr,

        executionTimeMs:
          Date.now() - start,
      });
    };

    child.stdout.on(
      "data",
      (data) => {
        stdout += data.toString();

        // Prevent uncontrolled output growth.
        if (stdout.length > 1_000_000) {
          child.kill();
          finish("OUTPUT_LIMIT");
        }
      }
    );

    child.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();

        if (stderr.length > 1_000_000) {
          child.kill();
          finish("OUTPUT_LIMIT");
        }
      }
    );

    child.on(
      "error",
      () => {
        finish("RUNTIME_ERROR");
      }
    );

    child.on(
      "close",
      (code) => {

        if (finished) {
          return;
        }

        if (code === 0) {
          finish("COMPLETED");
        } else {
          finish("RUNTIME_ERROR");
        }
      }
    );

    const timer = setTimeout(() => {

      if (!finished) {
        child.kill();
        finish("TIME_LIMIT_EXCEEDED");
      }

    }, timeoutMs);

    child.on("close", () => {
      clearTimeout(timer);
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function executeCpp(
  code: string,
  inputOutput: any
): Promise<ExecutionResult> {

  const testCases =
    parseInputOutput(inputOutput);

  if (testCases.length === 0) {

    return {
      success: false,
      passed: false,
      status: "NO_TEST_CASES",
      message:
        "No executable test cases are available.",
      passedTests: 0,
      totalTests: 0,
      executionTimeMs: 0,
    };
  }

  const uniqueId =
    crypto.randomBytes(8).toString("hex");

  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `skillbridge_${uniqueId}_`
      )
    );

  const sourcePath =
    path.join(
      tempDir,
      "main.cpp"
    );

  const executablePath =
    path.join(
      tempDir,
      "main.exe"
    );

  try {

    // Write student's source code.
    fs.writeFileSync(
      sourcePath,
      code,
      "utf8"
    );

    // --------------------------------------------------
    // COMPILE
    // --------------------------------------------------

    const compileResult =
      await new Promise<{
        success: boolean;
        stderr: string;
      }>((resolve) => {

        const compiler =
          spawn(
            "g++",
            [
              sourcePath,
              "-std=c++17",
              "-O2",
              "-o",
              executablePath,
            ],
            {
              windowsHide: true,
              stdio: [
                "ignore",
                "pipe",
                "pipe",
              ],
            }
          );

        let stderr = "";

        compiler.stderr.on(
          "data",
          (data) => {
            stderr += data.toString();

            if (
              stderr.length >
              1_000_000
            ) {
              compiler.kill();
            }
          }
        );

        compiler.on(
          "error",
          () => {
            resolve({
              success: false,
              stderr:
                "Unable to start g++ compiler.",
            });
          }
        );

        compiler.on(
          "close",
          (code) => {

            resolve({
              success: code === 0,
              stderr,
            });

          }
        );

      });

    if (!compileResult.success) {

      return {
        success: true,
        passed: false,
        status: "COMPILATION_ERROR",
        message:
          compileResult.stderr ||
          "Compilation failed.",
        passedTests: 0,
        totalTests: testCases.length,
        executionTimeMs: 0,
      };
    }

    // --------------------------------------------------
    // EXECUTE TEST CASES
    // --------------------------------------------------

    let passedTests = 0;
    let totalExecutionTime = 0;

    let lastOutput = "";

    for (
      let i = 0;
      i < testCases.length;
      i++
    ) {

      const testCase =
  testCases[i];

if (!testCase) {
  continue;
}

      const result =
        await runProcess(
          executablePath,
          testCase.input,
          3000
        );

      totalExecutionTime +=
        result.executionTimeMs;

      lastOutput =
        result.output;

      if (
        result.status ===
        "TIME_LIMIT_EXCEEDED"
      ) {

        return {
          success: true,
          passed: false,
          status:
            "TIME_LIMIT_EXCEEDED",
          message:
            `Time limit exceeded on test case ${
              i + 1
            }.`,
          passedTests,
          totalTests:
            testCases.length,
          executionTimeMs:
            totalExecutionTime,
          output: lastOutput,
        };
      }

      if (
        result.status !==
        "COMPLETED"
      ) {

        return {
          success: true,
          passed: false,
          status: result.status,
          message:
            `Runtime error on test case ${
              i + 1
            }.`,
          passedTests,
          totalTests:
            testCases.length,
          executionTimeMs:
            totalExecutionTime,
          output: lastOutput,
        };
      }

      const actual =
        normalizeOutput(
          result.output
        );

      const expected =
        normalizeOutput(
          testCase.expectedOutput
        );

      if (actual === expected) {

        passedTests++;

      } else {

        return {
          success: true,
          passed: false,
          status: "WRONG_ANSWER",
          message:
            `Wrong answer on test case ${
              i + 1
            }.`,
          passedTests,
          totalTests:
            testCases.length,
          executionTimeMs:
            totalExecutionTime,
          output: lastOutput,
        };
      }
    }

    // --------------------------------------------------
    // ALL TESTS PASSED
    // --------------------------------------------------

    return {
      success: true,
      passed: true,
      status: "ACCEPTED",
      message:
        "All test cases passed.",
      passedTests,
      totalTests:
        testCases.length,
      executionTimeMs:
        totalExecutionTime,
      output: lastOutput,
    };

  } finally {

    // --------------------------------------------------
    // CLEAN TEMPORARY FILES
    // --------------------------------------------------

    try {

      fs.rmSync(
        tempDir,
        {
          recursive: true,
          force: true,
        }
      );

    } catch (cleanupError) {

      console.error(
        "Temporary file cleanup failed:",
        cleanupError
      );

    }

  }
}