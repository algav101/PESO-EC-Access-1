import fs from "fs";
import https from "https";

function downloadImage(url, dest) {
  const file = fs.createWriteStream(dest);
  https.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Referer": "https://ibb.co/5Wp2q1z3",
    }
  }, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log("Redirecting to:", response.headers.location);
      downloadImage(response.headers.location, dest);
      return;
    }
    response.pipe(file);
    file.on("finish", () => {
      file.close(() => {
        const stats = fs.statSync(dest);
        console.log("Downloaded successfully! Size:", stats.size, "bytes");
      });
    });
  }).on("error", (err) => {
    fs.unlink(dest, () => {});
    console.error("Download error:", err.message);
  });
}

downloadImage("https://i.ibb.co/3y6ktT8b/1-2-6-x-2-2-in.png", "public/format1-stub-template.png");
