const { getAll, saveAll } = require("../../_store");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { id } = req.query;
    const bathrooms = await getAll();
    const index = bathrooms.findIndex((b) => b.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Bathroom not found" });
      return;
    }

    bathrooms[index] = { ...bathrooms[index], hasFlagged: true };
    await saveAll(bathrooms);
    res.status(200).json(bathrooms[index]);
  } catch (err) {
    res.status(err.message?.startsWith("No KV store") ? 503 : 400).json({ error: err.message });
  }
};
