const { list, put } = require("@vercel/blob");

const STATE_PATH = "db/findit-state.json";

async function readState() {
  const result = await list({ prefix: STATE_PATH, limit: 1 });
  const existing = result.blobs.find((blob) => blob.pathname === STATE_PATH) || result.blobs[0];

  if (!existing) {
    return null;
  }

  const response = await fetch(existing.url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Blob read failed with status ${response.status}`);
  }

  return response.json();
}

async function writeState(state) {
  await put(STATE_PATH, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

module.exports = {
  readState,
  writeState,
};
