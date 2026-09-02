import fs from "fs";
import { PNG } from "pngjs";

const inputPath = "public/format1-stub-template.png";
const outputPath = "public/format1-stub-base.png";

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on("parsed", function () {
    // 1. Clear inner QR code area (x: 42 to 232, y: 125 to 320) to pure white (#ffffff)
    for (let y = 124; y < 322; y++) {
      for (let x = 40; x < 233; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;
        this.data[idx + 1] = 255;
        this.data[idx + 2] = 255;
        this.data[idx + 3] = 255;
      }
    }

    // 2. Clear top right #1 designated number (x: 535 to 635, y: 35 to 100)
    for (let y = 35; y < 100; y++) {
      for (let x = 535; x < 635; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;
        this.data[idx + 1] = 255;
        this.data[idx + 2] = 255;
        this.data[idx + 3] = 255;
      }
    }

    // 3. Clear Beneficiary Name value (x: 250 to 630, y: 135 to 195)
    for (let y = 135; y < 195; y++) {
      for (let x = 250; x < 630; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;
        this.data[idx + 1] = 255;
        this.data[idx + 2] = 255;
        this.data[idx + 3] = 255;
      }
    }

    // 4. Clear Barangay value (x: 250 to 420, y: 220 to 290)
    for (let y = 220; y < 290; y++) {
      for (let x = 250; x < 420; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;
        this.data[idx + 1] = 255;
        this.data[idx + 2] = 255;
        this.data[idx + 3] = 255;
      }
    }

    // 5. Clear Table value (x: 480 to 580, y: 220 to 290)
    for (let y = 220; y < 290; y++) {
      for (let x = 480; x < 580; x++) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;
        this.data[idx + 1] = 255;
        this.data[idx + 2] = 255;
        this.data[idx + 3] = 255;
      }
    }

    this.pack().pipe(fs.createWriteStream(outputPath)).on("finish", () => {
      console.log("Created public/format1-stub-base.png successfully!");
      const b64 = fs.readFileSync(outputPath).toString("base64");
      fs.writeFileSync(
        "src/components/stubs/format1-stub-base-b64.ts",
        `export const FORMAT1_STUB_BASE_IMAGE = "data:image/png;base64,${b64}";\n`
      );
      console.log("Exported src/components/stubs/format1-stub-base-b64.ts successfully!");
    });
  });
