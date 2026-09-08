const git = require("isomorphic-git");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "..");

async function doCommit() {
  try {
    console.log("Checking Git status in:", dir);

    // List of files to add / track
    const filesToStage = [
      "src/lib/qr.ts",
      "src/lib/qr-client-cache.ts",
      "src/lib/work-assignment.ts",
      "src/app/api/v1/work-assignment/lookup/route.ts",
      "src/app/my-assignment/page.tsx",
      "src/app/reports/page.tsx",
      "src/app/page.tsx",
      "src/components/public/PublicWorkAssignmentScannerCard.tsx",
      "src/components/layout/LandingNavDrawer.tsx",
      "src/components/layout/Sidebar.tsx",
      "src/lib/excel-exporter.ts",
      "test/test-suite.mjs",
      "test/verify-qr-flow.mjs",
      "scripts/commit.js",
    ];

    for (const filepath of filesToStage) {
      if (fs.existsSync(path.join(dir, filepath))) {
        await git.add({ fs, dir, filepath });
        console.log(`  + Staged: ${filepath}`);
      }
    }

    // Check current branch
    const branch = await git.currentBranch({ fs, dir, fullname: false });
    console.log("Current branch:", branch || "main");

    // Commit
    const commitSha = await git.commit({
      fs,
      dir,
      author: {
        name: "PESO Dingalan",
        email: "peso@dingalan.gov.ph",
      },
      message: "feat(privacy): retain original QR codes and enforce middle-name auth for work area and schedule routing",
    });

    console.log("\n[SUCCESS] Committed successfully!");
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
