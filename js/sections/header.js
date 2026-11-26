// Today's date, greeting and the daily tip.

import { TIPS } from "../tips.js";

export function mount() {
  const now = new Date();
  document.getElementById("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const hour = now.getHours();
  document.getElementById("greeting").textContent =
    hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Same tip all day on every device; a new one each day.
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const tip = TIPS[day % TIPS.length];
  document.getElementById("tip-topic").textContent = tip.topic;
  document.getElementById("tip-text").textContent = tip.text;
}
