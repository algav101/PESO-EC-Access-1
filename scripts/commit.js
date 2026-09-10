const git = require("isomorphic-git");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "..");

async function doCommit() {
  try {
    console.log("Checking Git status in:", dir);

    // Scan all modified, added, and deleted files
    const FILE = 0, HEAD = 1, WORKDIR = 2, STAGE = 3;
    const matrix = await git.statusMatrix({ fs, dir });

    let stagedCount = 0;
    for (const row of matrix) {
      const filepath = row[FILE];
      // Skip node_modules, .next, etc. if not ignored
      if (filepath.startsWith("node_modules") || filepath.startsWith(".next") || filepath.startsWith(".git/")) {
        continue;
      }

      const head = row[HEAD];
      const workdir = row[WORKDIR];
      const stage = row[STAGE];

      if (workdir === 0 && head !== 0) {
        // File deleted
        await git.remove({ fs, dir, filepath });
        console.log(`  - Removed: ${filepath}`);
        stagedCount++;
      } else if (workdir !== 0 && (head !== workdir || stage !== workdir)) {
        // File created or modified
        await git.add({ fs, dir, filepath });
        console.log(`  + Staged: ${filepath}`);
        stagedCount++;
      }
    }

    console.log(`\nTotal files staged: ${stagedCount}`);

    if (stagedCount === 0) {
      console.log("Nothing to commit (working tree clean).");
      return;
    }

    // Check current branch
    const branch = await git.currentBranch({ fs, dir, fullname: false });
    console.log("Current branch:", branch || "main");

    const commitMsg =
      process.argv[2] ||
      "feat(compliance): apply data privacy (RA 10173), unbundled consent, accessibility (WCAG 2.1 AA), security hardening & claims adjustments";

    // Commit
    const commitSha = await git.commit({
      fs,
      dir,
      author: {
        name: "PESO Dingalan",
        email: "peso@dingalan.gov.ph",
      },
      message: commitMsg,
    });

    console.log("\n[SUCCESS] Committed successfully to local Git repository!");
    console.log("Commit SHA:", commitSha);

    // Log the latest commit
    const log = await git.log({ fs, dir, depth: 3 });
    console.log("\nRecent commit history:");
    log.forEach((c) => {
      console.log(`- [${c.oid.slice(0, 7)}] ${c.commit.message.trim()} (by ${c.commit.author.name})`);
    });
  } catch (err) {
    console.error("Error committing with isomorphic-git:", err);
    process.exit(1);
  }
}

doCommit();

