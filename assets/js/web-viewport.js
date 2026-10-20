// O palco mantém sua altura. A troca de dispositivo anima transform, sem relayout por quadro.
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
    canvas.style.setProperty("--web-scale", String(scale));
    frame.style.width = `${canvasWidth * scale}px`;
    frame.style.height = `${canvasHeight * scale + chromeHeight}px`;
    workspace.dataset.ready = "true";
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
    fit();
    if (!animate) {
      onRest();
      return;
    }
    const after = frame.getBoundingClientRect();
    const run = generation;
    moving = true;
    workspace.dataset.resizing = "true";
    const timing = { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" };
    transitions = [
      frame.animate(
        [
          {
            transform: `scale(${before.width / after.width}, ${before.height / after.height})`,
          },
          { transform: "none" },
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
