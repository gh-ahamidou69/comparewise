const MAX_PRODUCTS = 5;
const $ = (selector) => document.querySelector(selector);

let products = [];

function safeText(value, fallback = "Non disponible") {
  return value === undefined || value === null || String(value).trim() === "" ? fallback : String(value);
}

function formatPrice(price, currency) {
  if (price === undefined || price === null || String(price).trim() === "") return "Prix indisponible";
  const parsed = Number(String(price).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return `${price} ${currency || ""}`.trim();
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(parsed);
  } catch (_) {
    return `${parsed.toFixed(2)} ${currency || ""}`.trim();
  }
}

function showStatus(message, kind = "") {
  const status = $("#status");
  status.textContent = message;
  status.className = `status ${kind}`.trim();
  status.hidden = false;
}
function hideStatus() { $("#status").hidden = true; }

async function loadProducts() {
  const result = await chrome.storage.local.get({ comparewiseProducts: [] });
  products = Array.isArray(result.comparewiseProducts) ? result.comparewiseProducts : [];
  render();
}
async function persist() {
  await chrome.storage.local.set({ comparewiseProducts: products });
  render();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  $("#product-count").textContent = `${products.length} / ${MAX_PRODUCTS}`;
  $("#list-count").textContent = String(products.length);
  $("#empty-state").hidden = products.length > 0;
  $("#clear-all").hidden = products.length === 0;
  $("#add-current").disabled = products.length >= MAX_PRODUCTS;
  $("#add-current").style.opacity = products.length >= MAX_PRODUCTS ? ".55" : "1";
  const list = $("#product-list");
  list.replaceChildren();

  for (const product of products) {
    const card = el("article", "product-card");
    if (product.image && /^https?:\/\//i.test(product.image)) {
      const image = el("img", "product-image");
      image.src = product.image;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        const fallback = el("div", "product-image product-placeholder", "□");
        image.replaceWith(fallback);
      }, { once: true });
      card.append(image);
    } else {
      card.append(el("div", "product-image product-placeholder", "□"));
    }

    const info = el("div", "product-info");
    const title = el("span", "product-title", safeText(product.title, "Produit sans nom"));
    info.append(title);
    info.append(el("div", "product-meta", [product.brand, product.domain].filter(Boolean).join(" · ") || "Saisie manuelle"));
    info.append(el("div", "product-price", formatPrice(product.price, product.currency)));
    card.append(info);

    const actions = el("div", "product-actions");
    const open = el("a", "icon-btn source-link", "↗");
    open.href = /^https?:\/\//i.test(product.url || "") ? product.url : "#";
    open.target = "_blank";
    open.rel = "noreferrer";
    open.title = "Ouvrir la fiche produit";
    open.setAttribute("aria-label", "Ouvrir la fiche produit");
    actions.append(open);

    const remove = el("button", "icon-btn", "×");
    remove.type = "button";
    remove.title = "Supprimer ce produit";
    remove.setAttribute("aria-label", `Supprimer ${safeText(product.title)}`);
    remove.addEventListener("click", async () => {
      products = products.filter(item => item.id !== product.id);
      await persist();
      showStatus("Produit supprimé du comparatif.", "success");
    });
    actions.append(remove);
    card.append(actions);
    list.append(card);
  }

  const section = $("#comparison-section");
  section.hidden = products.length < 2;
  if (products.length >= 2) renderTable();
}

function renderTable() {
  const wrap = $("#comparison-table-wrap");
  const table = document.createElement("table");
  const fields = [
    ["Prix", p => formatPrice(p.price, p.currency)],
    ["Marque", p => safeText(p.brand)],
    ["Site", p => safeText(p.domain)],
    ["Caractéristiques", p => {
      const entries = Object.entries(p.specs || {});
      return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join(" · ") : "Non disponible";
    }],
    ["Source", p => safeText(p.extractionSource, "Saisie manuelle")]
  ];
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  header.append(el("th", "", "Critère"));
  products.forEach(p => header.append(el("th", "", safeText(p.title, "Produit").slice(0, 70))));
  thead.append(header);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const [label, getter] of fields) {
    const tr = document.createElement("tr");
    tr.append(el("td", "", label));
    products.forEach(p => {
      const value = getter(p);
      const td = el("td", value === "Non disponible" || value === "Prix indisponible" ? "missing" : "", value);
      tr.append(td);
    });
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.replaceChildren(table);
}

function parsePrice(raw) {
  if (raw === "") return "";
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : "";
}

async function addProduct(product) {
  if (products.length >= MAX_PRODUCTS) {
    showStatus("Limite atteinte : cinq produits maximum. Supprime-en un pour continuer.", "error");
    return false;
  }
  if (!product.title || !product.title.trim()) {
    showStatus("Le nom du produit est nécessaire. Utilise la saisie manuelle si la page ne le fournit pas.", "error");
    return false;
  }
  const normalizedUrl = product.url || "";
  if (normalizedUrl && products.some(p => p.url === normalizedUrl)) {
    showStatus("Ce produit est déjà dans ton comparatif.", "error");
    return false;
  }
  product.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  products.push(product);
  await persist();
  showStatus("Produit ajouté au comparatif.", "success");
  return true;
}

$("#add-current").addEventListener("click", async () => {
  hideStatus();
  if (products.length >= MAX_PRODUCTS) {
    showStatus("Limite atteinte : cinq produits maximum.", "error");
    return;
  }
  $("#add-current").disabled = true;
  showStatus("Lecture des informations de l'onglet actuel…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
      showStatus("Cette page ne peut pas être analysée. Ouvre une fiche produit classique en HTTP ou HTTPS.", "error");
      return;
    }
    // Inject only after the user clicks. No permanent access to every website.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content.js"] });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "COMPAREWISE_EXTRACT" });
    if (!response?.ok || !response.product?.title) {
      showStatus("Extraction incomplète. Utilise « Saisie manuelle » pour ajouter ce produit.", "error");
      return;
    }
    const p = response.product;
    const titleInput = $("#manual-title");
    const priceInput = $("#manual-price");
    const urlInput = $("#manual-url");
    const brandInput = $("#manual-brand");
    titleInput.value = p.title || "";
    priceInput.value = p.price ? parsePrice(p.price.replace(",", ".")) : "";
    $("#manual-currency").value = ["EUR", "USD", "GBP", "CHF"].includes(p.currency) ? p.currency : "EUR";
    urlInput.value = p.url || "";
    brandInput.value = p.brand || "";
    $("#manual-form").hidden = false;
    $("#manual-form").dataset.extracted = JSON.stringify(p);
    showStatus("Vérifie les informations détectées, puis clique sur « Ajouter ».", "success");
    titleInput.focus();
  } catch (error) {
    showStatus("Impossible de lire cette page. Essaie la saisie manuelle. Certaines pages limitent l'accès à leur contenu.", "error");
  } finally {
    $("#add-current").disabled = products.length >= MAX_PRODUCTS;
  }
});

$("#manual-toggle").addEventListener("click", () => {
  $("#manual-form").hidden = !$("#manual-form").hidden;
  if (!$("#manual-form").hidden) $("#manual-title").focus();
});
$("#cancel-manual").addEventListener("click", () => {
  $("#manual-form").hidden = true;
  $("#manual-form").reset();
  delete $("#manual-form").dataset.extracted;
});

$("#manual-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus();
  const form = $("#manual-form");
  const extracted = (() => {
    try { return JSON.parse(form.dataset.extracted || "{}"); } catch (_) { return {}; }
  })();
  const rawUrl = $("#manual-url").value.trim();
  let safeUrl = "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
      safeUrl = parsed.href;
    } catch (_) {
      showStatus("L'URL doit être une adresse valide commençant par http:// ou https://.", "error");
      return;
    }
  }
  const price = parsePrice($("#manual-price").value);
  const product = {
    ...extracted,
    title: $("#manual-title").value.trim(),
    price,
    currency: $("#manual-currency").value,
    url: safeUrl,
    brand: $("#manual-brand").value.trim(),
    domain: safeUrl ? new URL(safeUrl).hostname.replace(/^www\./, "") : "",
    specs: extracted.specs || {},
    extractionSource: extracted.title ? "Données de page, vérifiées par l'utilisateur" : "Saisie manuelle",
    manual: !extracted.title
  };
  const success = await addProduct(product);
  if (success) {
    form.reset();
    form.hidden = true;
    delete form.dataset.extracted;
  }
});

$("#clear-all").addEventListener("click", async () => {
  if (!products.length) return;
  if (!confirm("Effacer tous les produits de ce comparatif ?")) return;
  products = [];
  await persist();
  hideStatus();
});
$("#export-csv").addEventListener("click", () => {
  const headers = ["Nom", "Prix", "Devise", "Marque", "Site", "URL", "Caractéristiques"];
  const rows = products.map(p => [
    p.title || "", p.price ?? "", p.currency || "", p.brand || "", p.domain || "", p.url || "",
    Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join(" | ")
  ]);
  const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(escape).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "comparewise-comparatif.csv";
  link.click();
  URL.revokeObjectURL(url);
});

loadProducts().catch(() => showStatus("Impossible de lire les données locales de l'extension.", "error"));
