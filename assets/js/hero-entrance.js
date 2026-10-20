import { enter } from "./motion.js";
export function animateHeroEntrance() {
  const root = document.documentElement;
  if (root.classList.contains("hero-entered")) return;
  const sequences = [
    [".nav-pill", { distance: -24, delay: 100, duration: 600 }],
    [".hero h1", { axis: "x", distance: -40, delay: 160, duration: 720 }],
    [".hero-offer", { axis: "x", distance: 40, delay: 220, duration: 720 }],
    [".hero-showcase .web-scene", { distance: 40, delay: 280, duration: 780 }],
  ];
  sequences.forEach(([selector, options]) => {
    enter([document.querySelector(selector)], { fade: true, ...options });
  });
  root.classList.add("hero-entered");
}
