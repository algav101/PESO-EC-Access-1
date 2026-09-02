import fs from "fs";
import { PNG } from "pngjs";

// Read format1-stub-template.png to get exact bounds of text
fs.createReadStream("public/format1-stub-template.png")
  .pipe(new PNG())
  .on("parsed", function() {
    console.log(`Dimensions: ${this.width} x ${this.height}`);
    // Check key areas:
    // Beneficiary name label vs value
    // Barangay label vs value
    // Table assignment label vs value
    // Top right #1
    // Orientation line
  });
