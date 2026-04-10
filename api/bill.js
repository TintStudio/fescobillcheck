// Vercel Serverless Function — /api/bill.js
// Deploy free at vercel.com — works instantly, no server needed

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

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
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) throw new Error("PITC error");

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Could not fetch bill from FESCO" });
  }
}
