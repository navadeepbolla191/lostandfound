const { list, put } = require("@vercel/blob");

const STATE_PATH = "db/findit-state.json";

async function readState() {
  try {
    const { blobs } = await list({
      prefix: STATE_PATH,
    });
    
    if (blobs.length === 0) {
      return null;
    }
    
    // Pick the most recently uploaded blob
    const latestBlob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    
    const response = await fetch(latestBlob.url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Vercel Blob Read Error:", error);
    return null;
  }
}

async function writeState(state) {
  await put(STATE_PATH, JSON.stringify(state), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

module.exports = {
  readState,
  writeState,
};

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
