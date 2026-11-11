// Synthetic pixels only; does not read, upload or modify any user's ID.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module = {exports:{}};
const code = ts.transpileModule(fs.readFileSync("src/lib/id-photo-quality.ts","utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInThisContext(`(function(module,exports){${code}\n})`)(module,module.exports);
const {analyzeIdPhoto, normalizeIdLighting} = module.exports;
const width = 256, height = 160;
const pixels = sample => {
  const data = new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const index=(y*width+x)*4, value=sample(x,y);
    data.set([value,value,value,255],index);
  }
  return data;
};
const sharp = pixels((x,y) => x%16<3 && y%24<15 ? 20 : 220);
const blurred = pixels(x => 100 + x/3);
const clearResult = analyzeIdPhoto(sharp,width,height,2400);
assert.ok(clearResult.sharpness > analyzeIdPhoto(blurred,width,height,2400).sharpness);
assert.ok(clearResult.score > analyzeIdPhoto(blurred,width,height,2400).score);
assert.ok(analyzeIdPhoto(blurred,width,height,2400).warnings.some(message=>/malabo/.test(message)));
assert.ok(analyzeIdPhoto(pixels(()=>25),width,height,2400).warnings.some(message=>/Madilim/.test(message)));
assert.ok(analyzeIdPhoto(pixels(()=>254),width,height,2400).warnings.some(message=>/glare/.test(message)));
assert.ok(analyzeIdPhoto(sharp,width,height,600).warnings.some(message=>/Maliit/.test(message)));
assert.ok(!analyzeIdPhoto(sharp,width,height,900,800).warnings.some(message=>/Maliit/.test(message)),"Number close-ups use their own resolution threshold");
const shaded = pixels((x,y) => x>=80&&x<100&&y>=60&&y<66 ? 0 : x<128 ? 75 : 220);
const untouched = shaded.slice();
const normalized = normalizeIdLighting(shaded,width,height);
const gray = (x,y) => normalized[(y*width+x)*4];
assert.ok(Math.abs(gray(30,30)-gray(220,30))<3,"Background brightness is equalized across a shadow boundary");
assert.equal(gray(85,62),0,"Actual dark glyph pixels stay dark");
assert.deepEqual(shaded,untouched,"Normalization must never alter the original uploaded image pixels");
assert.throws(()=>analyzeIdPhoto(new Uint8ClampedArray(3),20,20,2400),/Invalid/);
console.log("PASS: blur/lighting/resolution guidance, sharp-frame selection scores, and non-destructive shadow normalization");
