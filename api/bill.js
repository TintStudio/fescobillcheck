export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const refno = (req.query.refno || "").replace(/\D/g, "");

  if (refno.length !== 14) {
    return res.status(400).json({ error: "Invalid reference number" });
  }

  try {
    const response = await fetch(
      `https://bill.pitc.com.pk/fescobill/general?refno=${refno}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://bill.pitc.com.pk/",
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: "FESCO server error" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Could not fetch bill from FESCO" });
  }
}
