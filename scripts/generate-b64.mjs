import fs from "fs";

const b64 = fs.readFileSync("public/etupad-base.png").toString("base64");
const content = `export const ETUPAD_BASE_IMAGE = "data:image/png;base64,${b64}";\n`;

fs.writeFileSync("src/components/stubs/etupad-base-b64.ts", content);
console.log("Created src/components/stubs/etupad-base-b64.ts successfully!");
