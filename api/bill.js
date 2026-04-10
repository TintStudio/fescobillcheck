export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const refno = (req.query.refno || "").replace(/\D/g, "");
  if (refno.length !== 14) {
    return res.status(400).json({ error: "Invalid reference number" });
  }

  const PITC_URL = `https://bill.pitc.com.pk/fescobill/general?refno=${refno}`;

  // Method 1: Try allorigins (free proxy that bypasses geo-block)
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(PITC_URL)}`;
    const r = await fetch(proxyUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const wrapper = await r.json();
    const raw = wrapper.contents;

    if (raw && raw.trim().startsWith("{")) {
      const data = JSON.parse(raw);
      return res.status(200).json({ ...data, _source: "allorigins" });
    }

    // If HTML returned, scrape it
    if (raw && raw.includes("<")) {
      const scraped = scrapeHTML(raw, refno);
      if (scraped) return res.status(200).json({ ...scraped, _source: "scraped" });
      // Return raw for debugging
      return res.status(200).json({ _raw: raw.slice(0, 3000), _source: "allorigins-html" });
    }
  } catch (e) {
    console.log("allorigins failed:", e.message);
  }

  // Method 2: corsproxy.io
  try {
    const r2 = await fetch(`https://corsproxy.io/?${encodeURIComponent(PITC_URL)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/html, */*",
      }
    });
    const text2 = await r2.text();
    if (text2 && text2.trim().startsWith("{")) {
      const data2 = JSON.parse(text2);
      return res.status(200).json({ ...data2, _source: "corsproxy" });
    }
    if (text2 && text2.includes("<")) {
      const scraped2 = scrapeHTML(text2, refno);
      if (scraped2) return res.status(200).json({ ...scraped2, _source: "scraped2" });
      return res.status(200).json({ _raw: text2.slice(0, 3000), _source: "corsproxy-html" });
    }
  } catch (e) {
    console.log("corsproxy failed:", e.message);
  }

  // Method 3: Direct attempt with full browser headers
  try {
    const r3 = await fetch(PITC_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9,ur;q=0.8",
        "Referer": "https://bill.pitc.com.pk/fescobill",
        "Origin": "https://bill.pitc.com.pk",
      }
    });
    const text3 = await r3.text();
    if (text3 && text3.trim().startsWith("{")) {
      return res.status(200).json({ ...JSON.parse(text3), _source: "direct" });
    }
    if (text3) {
      return res.status(200).json({ _raw: text3.slice(0, 3000), _source: "direct-raw" });
    }
  } catch (e) {
    console.log("direct failed:", e.message);
  }

  return res.status(502).json({ error: "All methods failed — PITC is blocking non-PK IPs" });
}

// HTML scraper — extracts bill fields from PITC HTML page
function scrapeHTML(html, refno) {
  try {
    function between(str, a, b) {
      const s = str.indexOf(a);
      if (s === -1) return "";
      const e = str.indexOf(b, s + a.length);
      return e === -1 ? "" : str.slice(s + a.length, e).trim().replace(/<[^>]+>/g, "").trim();
    }
    function val(label) {
      // Look for table cell after label
      const patterns = [
        new RegExp(label + '[^<]*</td>\\s*<td[^>]*>([^<]+)', 'i'),
        new RegExp(label + '[^<]*</th>\\s*<td[^>]*>([^<]+)', 'i'),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[1].trim();
      }
      return "";
    }

    return {
      consumerName:    val("Consumer Name") || val("Name"),
      billingMonth:    val("Billing Month") || val("Bill Month"),
      dueDate:         val("Due Date") || val("Last Date"),
      payableAmount:   val("Payable Amount") || val("Net Payable") || val("Amount Payable"),
      unitsConsumed:   val("Units Consumed") || val("Units"),
      payableAmountAfterDueDate: val("After Due Date") || val("Surcharge Amount"),
      electricityCharges: val("Electricity Charges"),
      fpa:             val("FPA") || val("Fuel Price"),
      trSurcharge:     val("TR Surcharge") || val("T\\.R"),
      gst:             val("GST") || val("Sales Tax"),
      status:          html.includes("PAID") || html.includes("Paid") ? "Paid" : "Unpaid",
      _refno:          refno,
    };
  } catch {
    return null;
  }
}
