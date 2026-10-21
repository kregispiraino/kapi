// O palco mantém sua altura; apenas a moldura muda, sem esticar o conteúdo.
export function createWebViewport({
  workspace,
  frame,
  canvas,
  reducedMotion,
  onStart,
  onRest,
}) {
  const buttons = [
    ...workspace.parentElement.querySelectorAll("[data-device-button]"),
  ];
  const chrome = frame.querySelector(".web-chrome");
  let transitions = [];
  let moving = false;
  let generation = 0;
  let pendingFrame = 0;
  let previousWidth = 0;
  let previousHeight = 0;

  function stop() {
    generation++;
    transitions.forEach((animation) => animation.cancel());
    transitions = [];
    moving = false;
    workspace.dataset.resizing = "false";
  }
  function fit() {
    const style = getComputedStyle(workspace);
    const width =
      workspace.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const height =
      workspace.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom);
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const chromeHeight = chrome.offsetHeight;
    const scale = Math.max(
      0.1,
      Math.min(1, width / canvasWidth, (height - chromeHeight) / canvasHeight),
    );
    const size = {
      width: canvasWidth * scale,
      height: canvasHeight * scale + chromeHeight,
      scale,
      chromeHeight,
    };
    canvas.style.setProperty("--web-scale", String(scale));
    frame.style.width = `${size.width}px`;
    frame.style.height = `${size.height}px`;
    workspace.dataset.ready = "true";
    return size;
  }
  function refresh() {
    stop();
    fit();
    onRest();
  }
  function setDevice(device, withMotion = true) {
    if (
      workspace.dataset.device === device &&
      workspace.dataset.ready &&
      !moving
    )
      return;
    onStart();
    const animate = withMotion && !reducedMotion() && !document.hidden;
    const before = animate ? frame.getBoundingClientRect() : null;
    stop();
    workspace.dataset.device = device;
    canvas.style.width = `${device === "mobile" ? 320 : 880}px`;
    frame.style.borderRadius = device === "mobile" ? "16px" : "10px";
    buttons.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.deviceButton === device),
      ),
    );
    const after = fit();
    if (!animate) {
      onRest();
      return;
    }
    const run = generation;
    moving = true;
    workspace.dataset.resizing = "true";
    const timing = { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" };
    // Preenche a moldura durante toda a troca, como object-fit: cover.
    // Escala uniforme evita deformação e faixas vazias nos formatos estreitos.
    const cover = Math.max(
      1,
      before.width / after.width,
      (before.height - after.chromeHeight) / (after.height - after.chromeHeight),
    );
    transitions = [
      frame.animate(
        [
          {
            width: `${before.width}px`,
            height: `${before.height}px`,
          },
          { width: `${after.width}px`, height: `${after.height}px` },
        ],
        timing,
      ),
      canvas.animate(
        [
          { transform: `scale(${after.scale * cover}) translateX(-50%)` },
          { transform: `scale(${after.scale}) translateX(-50%)` },
        ],
        timing,
      ),
    ];
    Promise.allSettled(transitions.map((animation) => animation.finished)).then(
      () => {
        if (run !== generation) return;
        stop();
        onRest();
      },
    );
  }
  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener("click", () =>
      setDevice(button.dataset.deviceButton),
    );
  });
  function requestFit() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      refresh();
    });
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (
        Math.abs(width - previousWidth) < 0.5 &&
        Math.abs(height - previousHeight) < 0.5
      )
        return;
      previousWidth = width;
      previousHeight = height;
      requestFit();
    }).observe(workspace);
  } else window.addEventListener("resize", requestFit, { passive: true });
  document.fonts.ready.then(requestFit);
  setDevice(
    matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    false,
  );
  return { refresh, finish: stop, isMoving: () => moving };
}
