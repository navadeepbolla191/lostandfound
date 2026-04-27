const { readState, writeState } = require("./_blob-db");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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

    const { state } = req.body;
    if (!Array.isArray(state.accounts) || !Array.isArray(state.reports)) {
      return res.status(400).json({ error: "Invalid state structure: accounts and reports must be arrays." });
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
