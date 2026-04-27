const { get, put } = require("@vercel/blob");

const STATE_PATH = "db/findit-state.json";

async function readState() {
  let result;
  try {
    result = await get(STATE_PATH, {
      access: "private",
    });
  } catch (error) {
    if (
      error &&
      typeof error.message === "string" &&
      (error.message.includes("not found") || error.message.includes("404"))
    ) {
      return null;
    }
    throw error;
  }

  if (!result) {
    return null;
  }

  return JSON.parse(await streamToString(result.stream));
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

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
