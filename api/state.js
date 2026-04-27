const { readState, writeState } = require("./_blob-db");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const state = await readState();
      return res.status(200).json({ state });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to read state.",
      });
    }
  }

  if (req.method === "POST") {
    if (!req.body || !req.body.state) {
      return res.status(400).json({ error: "Missing state payload." });
    }

    try {
      await writeState(req.body.state);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to persist state.",
      });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
};
