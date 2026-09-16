/**
 * Release automation invariants (release-please + npm Trusted Publishing).
 *
 * Guards the pieces a release depends on but that no other test exercises:
 * version synchronization (CLAUDE.md Rule 4), the release-please configuration,
 * and the OIDC requirements of `.github/workflows/release.yml`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface PackageJson {
  name: string;
  version: string;
}

interface ChangelogSection {
  type: string;
  section: string;
  hidden?: boolean;
}

interface ReleasePleaseConfig {
  "include-component-in-tag": boolean;
  "include-v-in-tag": boolean;
  "pull-request-title-pattern": string;
  "exclude-paths": string[];
  "changelog-sections": ChangelogSection[];
  packages: Record<
    string,
    {
      "changelog-path": string;
      "extra-files": { type: string; path: string }[];
    }
  >;
}

// Vitest runs from the repository root
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
const config = JSON.parse(
  readFileSync("release-please-config.json", "utf8"),
) as ReleasePleaseConfig;
const workflow = readFileSync(".github/workflows/release.yml", "utf8");
const commitlintCli = realpathSync("node_modules/.bin/commitlint");

describe("release automation", () => {
  describe("version synchronization (CLAUDE.md Rule 4)", () => {
    it("keeps .release-please-manifest.json in sync with package.json", () => {
      const manifest: unknown = JSON.parse(
        readFileSync(".release-please-manifest.json", "utf8"),
      );

      expect(manifest).toStrictEqual({ ".": pkg.version });
    });

    it("keeps sonar.projectVersion in sync inside a release-please block", () => {
      const sonar = readFileSync("sonar-project.properties", "utf8");

      expect(sonar).toContain(
        `# x-release-please-start-version\nsonar.projectVersion=${pkg.version}\n# x-release-please-end\n`,
      );
    });

    it("keeps the Current Version line of CLAUDE.md in sync", () => {
      const claudeMd = readFileSync("CLAUDE.md", "utf8");

      expect(claudeMd).toContain(
        `**Current Version**: ${pkg.version} <!-- x-release-please-version -->`,
      );
    });
  });

  describe("release-please-config.json", () => {
    it("tags the root package as vX.Y.Z like the existing tags", () => {
      expect(config["include-component-in-tag"]).toBe(false);
      expect(config["include-v-in-tag"]).toBe(true);
      expect(Object.keys(config.packages)).toStrictEqual(["."]);
    });

    it("updates every other file that carries the version", () => {
      const extraFiles = config.packages["."]?.["extra-files"].map(
        (file) => file.path,
      );

      expect(extraFiles).toStrictEqual([
        "sonar-project.properties",
        "CLAUDE.md",
      ]);
    });

    it("never releases commits that only touch package-lock.json", () => {
      expect(config["exclude-paths"]).toStrictEqual(["package-lock.json"]);
    });

    it("releases user-facing commit types and hides internal ones", () => {
      const sections = config["changelog-sections"];
      const visible = sections
        .filter((s) => s.hidden !== true)
        .map((s) => s.type);
      const hidden = sections
        .filter((s) => s.hidden === true)
        .map((s) => s.type);

      expect(visible).toStrictEqual(["feat", "fix", "perf", "build", "revert"]);
      expect(hidden).toStrictEqual([
        "refactor",
        "docs",
        "style",
        "test",
        "ci",
        "chore",
      ]);
    });

    it("titles the release PR so that its commit passes commitlint", () => {
      const title = config["pull-request-title-pattern"].replace(
        "${version}",
        () => pkg.version,
      );

      expect(title).toBe(`release: v${pkg.version}`);
      expect(() =>
        execFileSync(process.execPath, [commitlintCli], {
          input: title,
          stdio: "pipe",
        }),
      ).not.toThrow();
    });
  });

  describe(".github/workflows/release.yml", () => {
    it("runs on a GitHub-hosted runner (required by npm Trusted Publishing)", () => {
      expect(workflow).toMatch(/^ {4}runs-on: ubuntu-latest$/m);
      expect(workflow).not.toContain("self-hosted");
    });

    it("can mint an OIDC token for npm", () => {
      expect(workflow).toMatch(/^ {6}id-token: write\b/m);
    });

    it("does not set registry-url (its .npmrc breaks OIDC publishing)", () => {
      expect(workflow).not.toMatch(/^ +registry-url:/m);
    });

    it("is not triggered by tag pushes (release-please pushes the tags)", () => {
      expect(workflow).not.toMatch(/^ +tags:/m);
    });

    it("never cancels a run between tagging and publishing", () => {
      expect(workflow).toContain("cancel-in-progress: false");
    });

    it("pins release-please-action to a commit SHA", () => {
      expect(workflow).toMatch(
        /googleapis\/release-please-action@[\da-f]{40} /,
      );
    });

    it("publishes the package with provenance", () => {
      expect(workflow).toContain("npm publish --provenance --access public");
    });
  });
});
