/**
 * One-off: copy all Manus-hosted (files.manuscdn.com) image assets into our
 * own Cloudflare R2 bucket under the key prefix "migrated/", so the site no
 * longer depends on Manus. Run in the Railway Console (R2_* env vars present):
 *
 *   node scripts/migrate-manus-images.cjs
 *
 * After it reports all OK, the code URLs are rewritten to /files/migrated/<file>.
 */
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const PREFIX =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/";
const FILES = [
  "AAkMQonwpGTFfxlx.jpg", "CaSUALRPwpkQDDyz.png", "ExFyNRXdbJhSwWpR.jpg",
  "FExyOmKcAqqrSQkC.jpg", "FNouoNsNLTkAiDKB.jpg", "GihOrTKVQPsOHIxQ.jpg",
  "GyBuWooHvGHZgRVJ.jpeg", "JkROfRrqqpCGwfuP.png", "NCXljemgcBhEldBY.jpg",
  "QxFYGzgmpzrKbZOs.jpg", "QxrYSewOYzAuPIEN.jpeg", "UfVeuAhSuGdmrpgb.jpg",
  "VVzPvoNHvKuenjJC.jpg", "WttGGxbUvvuiLuiQ.jpg", "XFSKFfBDnwuNIcYC.jpg",
  "XKmcLcwwCgIUrXwm.png", "ZTneyTCDMaRFZnSd.png", "cRuovhLnzbbhOziq.jpg",
  "dbBmVZceycIprbDa.jpg", "fcxuovpOPVSYDEOL.jpg", "hzbRrgiiMQYyvWTv.png",
  "ixmfLjNLHxyqCXzT.jpg", "kMEinJVrDybnuqph.jpg", "kUbFXwPeFvsStTWl.jpg",
  "llcNNhaJPILqCLZZ.jpg", "mHfcoLTVeHOgtyJc.png", "mZzfiMupcbdtczPP.png",
  "nCaOEbPxJfKYRtpD.jpg", "oGYCKRHyaDJycUxN.jpg", "oLYlgeIIkWTCNMTB.jpeg",
  "rqYJsserdhaaeKxB.jpg", "saxLOcubreWkfnzl.png", "tKJIowLUONIjAcMQ.jpg",
  "zNTBionUQKPpwweD.png",
];

const CT = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
};

(async () => {
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !process.env.R2_ACCOUNT_ID) {
    console.error("R2 env vars not set in this environment.");
    process.exit(1);
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  let ok = 0;
  const failed = [];
  for (const name of FILES) {
    const key = `migrated/${name}`;
    try {
      const r = await fetch(PREFIX + name);
      if (!r.ok) {
        console.log(`DOWNLOAD FAIL ${r.status}  ${name}`);
        failed.push(name);
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const ext = name.split(".").pop().toLowerCase();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ContentType: CT[ext] || "application/octet-stream",
        })
      );
      console.log(`OK  ${key}  (${buf.length} bytes)`);
      ok++;
    } catch (e) {
      console.log(`ERROR  ${name}  ${e.message}`);
      failed.push(name);
    }
  }
  console.log(`\nDone: ${ok}/${FILES.length} uploaded.`);
  if (failed.length) console.log("Failed:", failed.join(", "));
})();
