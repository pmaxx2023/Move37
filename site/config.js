/* Store settings. Fill these in before launch. */
window.STORE = {
  /* Checkout links, one per product. A Shopify cart link or a Lemon Squeezy link both work. */
  checkout: {
    full: "",
    pro: ""
  },
  /* Shown as the Contact link in the footer. */
  supportEmail: "",
  /* Google Ads tag, for example "AW-123456789". Leave blank to turn tracking off. */
  googleAdsId: "",
  /* Conversion labels from Google Ads, one per product. */
  conversionLabel: {
    full: "",
    pro: ""
  }
};

(() => {
  const id = window.STORE.googleAdsId;
  if (!id) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id);
})();
