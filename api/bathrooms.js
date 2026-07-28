const { getAll, saveAll, createBathroom } = require("./_store");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const bathrooms = await getAll();
      res.status(200).json(bathrooms);
      return;
    }

    if (req.method === "POST") {
      const bathrooms = await getAll();
      const bathroom = createBathroom(req.body || {});
      await saveAll([bathroom, ...bathrooms]);
      res.status(201).json(bathroom);
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(err.message?.startsWith("No KV store") ? 503 : 400).json({ error: err.message });
  }
};
