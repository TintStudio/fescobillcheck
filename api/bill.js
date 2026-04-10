export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const refno = (req.query.refno || "").replace(/\D/g, "");

  if (refno.length !== 14) {
    return res.status(400).json({ error: "Invalid reference number" });
  }

  const urls = [
    `https://bill.pitc.com.pk/fescobill/general?refno=${refno}`,
    `https://bill.pitc.com.pk/fescobill/consumer?refno=${refno}`,
  ];

  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Referer": "https://bill.pitc.com.pk/fescobill",
    "Origin": "https://bill.pitc.com.pk",
    "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Connection": "keep-alive",
  };

  let lastError = "";

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers, method: "GET" });

      const text = await response.text();

      // log raw for debugging
      console.log("PITC raw response:", text.slice(0, 500));

      if (!text || text.trim() === "") {
        lastError = "Empty response from FESCO";
        continue;
      }

      // Try parse as JSON
      try {
        const data = JSON.parse(text);
        return res.status(200).json({ ...data, _raw: text.slice(0, 1000), _url: url });
      } catch {
        // Not JSON — return raw so we can debug
        return res.status(200).json({ _raw: text.slice(0, 2000), _url: url, _parseError: "Not JSON" });
      }

    } catch (err) {
      lastError = err.message;
      console.error("Fetch error:", err.message);
    }
  }

  return res.status(502).json({ error: "Could not reach FESCO server", detail: lastError });
}
