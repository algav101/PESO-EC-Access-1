const git = require("isomorphic-git");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "..");

async function checkRemotes() {
  try {
    const remotes = await git.listRemotes({ fs, dir });
    console.log("Git Remotes:", JSON.stringify(remotes, null, 2));
    const currentBranch = await git.currentBranch({ fs, dir, fullname: false });
    console.log("Current branch:", currentBranch);
  } catch (err) {
    console.error("Error listing remotes:", err);
  }
}

checkRemotes();
