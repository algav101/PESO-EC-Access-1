# Guided ID camera

The shared applicant/dependent ID upload panel now offers **Camera na may ID guide** in addition to the existing image/PDF picker. It is used by online applications and walk-in encoding.

## Capture flow

1. Select the ID type, then open the front/back camera button.
2. Align the entire ID inside the green border. Move the phone to focus; avoid glare.
3. Capture, inspect the photo, and choose **Gamitin ang photo** or **Kunan muli**.
4. Confirmed front/back images enter the existing file validation and OCR flow. Manual corrections remain protected.

Default guides:

| Selected document | Guide |
| --- | --- |
| National ID, driver's license, voter ID, and other cards | Landscape card |
| Voter's certificate, police clearance, NBI clearance | Larger portrait document |
| Passport | Bio-data page |
| Optional applicant ID-number close-up | Wide number strip |

The certificate option's existing stored value `VOTER'S CETIFICATE` is still supported. Other document layouts can use the **Uri ng border**, rotate, and size controls. These are manual alignment guides, not automatic edge detection or physical-size measurement.

The captured JPEG is cropped from native camera pixels matching the visible guide, including a small edge allowance. Capture handles the live preview's `object-fit: cover` scaling and does not upscale small camera images. The longest output edge is capped at 2,400 pixels.

## Browser/privacy requirements

- Live capture needs a secure context (HTTPS in production, or localhost for development), a supported media API, and the user's camera permission. Plain HTTP over a phone's LAN IP normally cannot use the in-page camera. See [getUserMedia requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security).
- Only video is requested; microphone access is never requested.
- Tracks are stopped on close, review, backgrounding, camera switch, or unmount. Pending streams arriving after cancellation are stopped too. Returning from another app/tab requires an explicit resume action.
- Opening the camera or reviewing a photo does not upload it. Confirmed front/back images are later saved through the existing draft/submission workflow. The optional number close-up remains local to OCR and is not added to supporting documents.
- Permission denial, no camera, or unsupported/insecure browsers leave image/PDF selection available. The ordinary file picker no longer forces the phone's native camera.

## Verification

- `node test/test-id-camera-guide.mjs`: presets, larger certificate area, rotation/size bounds, native crop geometry.
- `node test/test-id-camera-browser.mjs`: mobile/landscape layouts, canvas-backed synthetic video, JPEG crops, review/retake/confirmation, dependent/back/number panels, camera switch, permission/missing/API errors, gallery fallback, background pause, and cancellation cleanup. No real camera or API writes.
- Physical iPhone/Android testing remains a deployment smoke check: verify rear-camera selection, autofocus, permission prompts, orientation, and the saved photo's legibility over HTTPS.
