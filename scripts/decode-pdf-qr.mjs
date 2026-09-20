import fs from "fs";
import path from "path";
import jsqr from "jsqr";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const pdfPath = "C:\\Users\\My PC\\.gemini\\antigravity-ide\\brain\\feaddd2e-0cc0-4058-b2e6-ee705bd28bd6\\.user_uploaded\\media_1789871571896.pdf";

async function main() {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  console.log(`PDF loaded. Total pages: ${doc.numPages}`);

  const page1 = await doc.getPage(1);
  const ops = await page1.getOperatorList();
  console.log(`Page 1 operator count: ${ops.fnArray.length}`);

  // Let's see what image objects exist on page 1
  const imageNames = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      imageNames.push(ops.argsArray[i][0]);
    }
  }
  console.log(`Page 1 paintImageXObject calls: ${imageNames.length}`, imageNames);

  for (const imgName of imageNames) {
    try {
      const img = page1.objs.get(imgName);
      if (img) {
        console.log(`Image ${imgName}: width=${img.width}, height=${img.height}`);
        let rgbaData;
        if (img.data.length === img.width * img.height * 4) {
          rgbaData = img.data;
        } else if (img.data.length === img.width * img.height * 3) {
          rgbaData = new Uint8ClampedArray(img.width * img.height * 4);
          for (let p = 0, q = 0; p < img.data.length; p += 3, q += 4) {
            rgbaData[q] = img.data[p];
            rgbaData[q + 1] = img.data[p + 1];
            rgbaData[q + 2] = img.data[p + 2];
            rgbaData[q + 3] = 255;
          }
        } else if (img.data.length === img.width * img.height) {
          rgbaData = new Uint8ClampedArray(img.width * img.height * 4);
          for (let p = 0, q = 0; p < img.data.length; p++, q += 4) {
            const v = img.data[p];
            rgbaData[q] = v;
            rgbaData[q + 1] = v;
            rgbaData[q + 2] = v;
            rgbaData[q + 3] = 255;
          }
        }
        if (rgbaData) {
          const code = jsqr(rgbaData, img.width, img.height);
          if (code) {
            console.log(`Decoded QR from ${imgName}: "${code.data}"`);
          } else {
            console.log(`No QR found directly in ${imgName}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error getting img ${imgName}: ${e.message}`);
    }
  }
}

main().catch(console.error);
