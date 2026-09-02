import fs from "fs";
import { PNG } from "pngjs";

const inputPath = "public/etupad-card-template.png";
const outputPath = "public/etupad-base.png";

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on("parsed", function () {
    // 1. Clear inner QR code area (x: 55 to 298, y: 139 to 382) to pure white (#ffffff)
    for (let y = 140; y < 380; y++) {
      for (let x = 56; x < 298; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;     // R
        this.data[idx + 1] = 255; // G
        this.data[idx + 2] = 255; // B
        this.data[idx + 3] = 255; // Alpha
      }
    }

    // 2. Clear variable #1 area (x: 380 to 560, y: 235 to 330) to pure white (#ffffff)
    for (let y = 235; y < 330; y++) {
      for (let x = 360; x < 580; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;     // R
        this.data[idx + 1] = 255; // G
        this.data[idx + 2] = 255; // B
        this.data[idx + 3] = 255; // Alpha
      }
    }

    this.pack().pipe(fs.createWriteStream(outputPath));
    console.log("Successfully created clean base template: public/etupad-base.png");
  });
