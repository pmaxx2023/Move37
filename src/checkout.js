
/* ---------- Checkout links ---------- */
(() => {
  const cfg = window.STORE || {};
  for (const a of document.querySelectorAll("[data-buy]")) {
    const tier = a.dataset.buy, url = cfg.checkout && cfg.checkout[tier];
    if (url) {
      a.href = url;
      a.addEventListener("click", () => track("begin_checkout", { edition: tier, value: tier === "pro" ? 39 : 19, currency: "USD" }));
    } else {
      a.setAttribute("aria-disabled", "true");
      a.textContent = "Coming soon";
    }
  }
  const c = document.getElementById("contact");
  if (c && cfg.supportEmail) c.href = "mailto:" + cfg.supportEmail; else if (c) c.hidden = true;
})();
