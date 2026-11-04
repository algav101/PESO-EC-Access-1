// Pure geometry tests; no camera, browser, database or external service needed.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync("src/lib/id-camera-guide.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInThisContext(`(function(module,exports){${code}\n})`)(module, module.exports);
const { getIdCameraPreset, getCameraGuideRect, getCameraSourceCrop, ID_CAMERA_GUIDES } = module.exports;
assert.equal(getIdCameraPreset("NATIONAL ID"), "CARD");
assert.equal(getIdCameraPreset("DRIVER LICENSE ID"), "CARD");
for (const type of ["VOTER'S CETIFICATE", "VOTER'S CERTIFICATE", "POLICE CLEARANCE", "NBI CLEARANCE"]) assert.equal(getIdCameraPreset(type), "DOCUMENT");
assert.equal(getIdCameraPreset("PASSPORT"), "PASSPORT");
assert.equal(getIdCameraPreset("NATIONAL ID", true), "NUMBER");
const card = getCameraGuideRect(390, 550, "CARD"), paper = getCameraGuideRect(390, 550, "DOCUMENT");
assert.ok(paper.width * paper.height > card.width * card.height * 1.5, "certificate guide must show a larger document area on a phone");
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`);
for (const [width, height] of [[390, 550], [320, 400], [844, 320], [1280, 720], [180, 120]]) {
  for (const preset of Object.keys(ID_CAMERA_GUIDES)) for (const rotated of [false, true]) for (const size of [0.75, 1, 1.05]) {
    const frame = getCameraGuideRect(width, height, preset, rotated, size);
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.x + frame.width <= width && frame.y + frame.height <= height);
    near(frame.width / frame.height, rotated ? 1 / ID_CAMERA_GUIDES[preset].ratio : ID_CAMERA_GUIDES[preset].ratio);
    for (const [vw, vh] of [[1920, 1080], [1080, 1920], [1280, 720]]) {
      const crop = getCameraSourceCrop(vw, vh, width, height, frame);
      assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= vw + 0.0001 && crop.y + crop.height <= vh + 0.0001);
      near(crop.width / crop.height, frame.width / frame.height);
    }
  }
}
// A landscape video displayed with cover in a tall viewport is horizontally cropped.
const source = getCameraSourceCrop(1920, 1080, 400, 600, { x: 50, y: 100, width: 300, height: 200 });
near(source.x, 679.2); near(source.y, 172.8); near(source.width, 561.6); near(source.height, 374.4);
assert.equal(getCameraGuideRect(0, 500, "CARD"), null);
assert.equal(getCameraGuideRect(NaN, 500, "CARD"), null);
assert.equal(getCameraSourceCrop(0, 1080, 400, 600, card), null);
assert.equal(getCameraSourceCrop(1920, 1080, 400, 600, { x: Infinity, y: 0, width: 10, height: 10 }), null);
console.log("ID camera guide passed: ID presets, larger certificates, rotate/resize, phone/landscape bounds and native-video crop mapping with edge allowance.");
