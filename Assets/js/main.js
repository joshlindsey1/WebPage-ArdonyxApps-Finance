document.querySelectorAll("img[data-fallback-target]").forEach((image) => {
  const fallbackId = image.getAttribute("data-fallback-target");
  const fallback = fallbackId ? document.getElementById(fallbackId) : null;

  if (!fallback) {
    return;
  }

  const showFallback = () => {
    image.style.display = "none";
    fallback.style.display = "flex";
  };

  if (!image.getAttribute("src")) {
    showFallback();
    return;
  }

  image.addEventListener("error", showFallback, { once: true });

  if (image.complete && image.naturalWidth === 0) {
    showFallback();
  }
});
