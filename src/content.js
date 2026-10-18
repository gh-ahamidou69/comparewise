(() => {
  if (globalThis.__compareWiseContentInstalled) return;
  globalThis.__compareWiseContentInstalled = true;
  // This script only extracts information from the page the user is visiting.
  // It does not send page data to any server.
  const clean = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  function findProductJsonLd() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const candidates = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node !== "object") return;
      if (node["@graph"]) walk(node["@graph"]);
      const type = node["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.some(t => typeof t === "string" && t.toLowerCase().includes("product"))) candidates.push(node);
    };
    for (const script of scripts) {
      try { walk(JSON.parse(script.textContent || "")); } catch (_) {}
    }
    return candidates.find(p => p.name || p.offers || p.image) || candidates[0] || null;
  }

  function getMeta(...selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = clean(element?.getAttribute("content") || "");
      if (value) return value;
    }
    return "";
  }

  function extract() {
    const product = findProductJsonLd();
    const offerValue = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
    const priceValue = offerValue?.price ?? offerValue?.lowPrice ?? "";
    const metaPrice = getMeta('meta[property="product:price:amount"]', 'meta[property="og:price:amount"]', 'meta[itemprop="price"]');
    const currency = clean(offerValue?.priceCurrency || getMeta('meta[property="product:price:currency"]', 'meta[property="og:price:currency"]')) || "EUR";
    const title = clean(product?.name) || getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') || clean(document.querySelector("h1")?.innerText) || clean(document.title);
    let image = "";
    const productImage = Array.isArray(product?.image) ? product.image[0] : product?.image;
    if (typeof productImage === "string") image = productImage;
    else if (productImage && typeof productImage.url === "string") image = productImage.url;
    image = image || getMeta('meta[property="og:image"]', 'meta[name="twitter:image"]');
    try { if (image) image = new URL(image, location.href).href; } catch (_) { image = ""; }

    let brand = "";
    if (typeof product?.brand === "string") brand = product.brand;
    else if (product?.brand && typeof product.brand.name === "string") brand = product.brand.name;
    brand = clean(brand);

    const specs = {};
    const additional = product?.additionalProperty;
    if (Array.isArray(additional)) {
      for (const item of additional.slice(0, 30)) {
        const name = clean(item?.name);
        const value = clean(String(item?.value ?? ""));
        if (name && value) specs[name] = value;
      }
    }
    const rawPrice = String(priceValue || metaPrice || "").replace(/[^\d.,]/g, "").trim();
    const price = (() => {
      if (!rawPrice) return "";
      const lastComma = rawPrice.lastIndexOf(",");
      const lastDot = rawPrice.lastIndexOf(".");
      let normalized = rawPrice;
      if (lastComma !== -1 && lastDot !== -1) {
        const decimalIndex = lastComma > lastDot ? lastComma : lastDot;
        normalized = [...rawPrice].map((char, index) => (char === "," || char === ".") ? (index === decimalIndex ? "." : "") : char).join("");
      } else if (lastComma !== -1) {
        const digitsAfter = rawPrice.length - lastComma - 1;
        normalized = digitsAfter > 0 && digitsAfter <= 2 ? rawPrice.replace(/\./g, "").replace(",", ".") : rawPrice.replace(/,/g, "");
      } else if ((rawPrice.match(/\./g) || []).length > 1) {
        const parts = rawPrice.split(".");
        const last = parts.pop();
        normalized = parts.join("") + (last.length <= 2 ? "." + last : last);
      }
      const number = Number(normalized);
      return Number.isFinite(number) ? String(number) : "";
    })();
    return {
      title: title.slice(0, 300),
      price,
      currency: currency.toUpperCase().slice(0, 8),
      brand: brand.slice(0, 100),
      image,
      url: location.href,
      domain: location.hostname.replace(/^www\./, ""),
      specs,
      extractedAt: new Date().toISOString(),
      extractionSource: product ? "JSON-LD / métadonnées" : "Métadonnées de page",
      manual: false
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "COMPAREWISE_EXTRACT") {
      try {
        sendResponse({ ok: true, product: extract() });
      } catch (error) {
        sendResponse({ ok: false, error: "Impossible d'extraire les informations de cette page." });
      }
    }
    return true;
  });
})();