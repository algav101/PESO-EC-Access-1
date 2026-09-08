const git = require("isomorphic-git");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "..");

async function doCommit() {
  try {
    console.log("Checking Git status in:", dir);

    // List of files to add / track
    const filesToStage = [
      "src/components/layout/Navbar.tsx",
      "src/app/field/page.tsx",
      "src/components/field/FieldQrPassGeneratorCard.tsx",
      "src/components/stubs/Format4SchedulePass.tsx",
      "src/app/stubs/page.tsx",
      "src/app/api/v1/programs/[id]/qr/generate-designated/route.ts",
      "src/app/api/v1/programs/[id]/beneficiaries/route.ts",
      "src/lib/qr-client-cache.ts",
      "test/test-suite.mjs",
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
      message: "fix(field): fix client-side runtime exception and feat(stubs): add batch designated QR code generation & Format 4 schedule pass",
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
