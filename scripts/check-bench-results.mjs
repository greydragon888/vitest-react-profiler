/**
 * Verifies that a `vitest bench` run actually measured something.
 *
 * A benchmark that throws on every iteration does NOT fail the run. Vitest
 * reports the task with no `hz` and no `sampleCount`, prints `NaNx faster` in
 * the summary, and the process still exits 0. Five benchmark files were broken
 * exactly that way and nobody noticed, because nothing in CI ran them. So the
 * CI job runs the suite and then runs this check - without it the job would
 * pass on a suite that measures nothing.
 *
 * `samples` cannot be used as the signal here: the bench config sets
 * `includeSamples: false`, so it is an empty array for healthy and dead
 * benchmarks alike. `sampleCount` and `hz` are the fields that go missing.
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

// The path is overridable so the check itself can be exercised against a
// known-bad report without disturbing the live one.
const REPORT_PATH = resolve(process.argv[2] ?? "./.bench/results.json");
const BENCH_DIR = resolve("./tests/benchmarks");
const BENCH_FILE = /\.bench\.tsx?$/;

/**
 * Collects every benchmark entry in the report together with a readable label.
 *
 * @param {{ files?: Array<object> }} report - Parsed benchmark report.
 * @returns {Array<{ label: string, benchmark: object }>} Flattened benchmarks.
 */
function flattenBenchmarks(report) {
  const flattened = [];

  for (const file of report.files ?? []) {
    const name = basename(file.filepath ?? "<unknown file>");

    for (const group of file.groups ?? []) {
      for (const benchmark of group.benchmarks ?? []) {
        flattened.push({ label: `${name} > ${benchmark.name}`, benchmark });
      }
    }
  }

  return flattened;
}

/**
 * Runs every check and reports the problems found.
 *
 * @returns {number} Process exit code: 0 when the report is sound, 1 otherwise.
 */
function main() {
  let report;

  try {
    report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  } catch (error) {
    console.error(`✗ Cannot read the benchmark report at ${REPORT_PATH}`);
    console.error(`  ${error.message}`);
    console.error("  Run `npm run test:bench` first - it writes the report.");

    return 1;
  }

  const problems = [];
  const reportedFiles = new Set(
    (report.files ?? []).map((file) => basename(file.filepath ?? "")),
  );

  // A file whose import fails does not appear in the report at all, so counting
  // benchmarks is not enough - the whole file has to be accounted for.
  const filesOnDisk = readdirSync(BENCH_DIR).filter((name) =>
    BENCH_FILE.test(name),
  );

  for (const name of filesOnDisk) {
    if (!reportedFiles.has(name)) {
      problems.push(`${name}: missing from the report - the file never ran`);
    }
  }

  const benchmarks = flattenBenchmarks(report);

  if (benchmarks.length === 0) {
    problems.push("the report contains no benchmarks at all");
  }

  for (const { label, benchmark } of benchmarks) {
    const { sampleCount, hz } = benchmark;

    if (!Number.isFinite(sampleCount) || sampleCount <= 0) {
      problems.push(
        `${label}: no samples - the body threw on every iteration (reported as NaNx)`,
      );
    } else if (!Number.isFinite(hz) || hz <= 0) {
      problems.push(`${label}: hz is ${hz} - nothing was measured`);
    }
  }

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) in the benchmark report:\n`);

    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }

    console.error(
      "\n  A benchmark that measures nothing still exits 0, which is why this check exists.",
    );

    return 1;
  }

  console.log(
    `✓ ${benchmarks.length} benchmarks across ${filesOnDisk.length} files all reported samples`,
  );

  return 0;
}

process.exitCode = main();
