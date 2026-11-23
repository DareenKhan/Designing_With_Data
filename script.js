// CCT360 Lab 6 — Evergreen
// Weather data for Hoh Rain Forest, Washington 
const apiURL = "https://api.open-meteo.com/v1/forecast?latitude=47.860862&longitude=-123.934792&current=temperature_2m,cloud_cover,rain,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=America%2FLos_Angeles&forecast_days=3";
const el = (id) => document.getElementById(id);
const rainAudio = el("rain-audio");
let weather = null;
let mode = "live";
let visibleScene = "sunny";
let openDetail = "";
let autoplayBlocked = false;

// Chooses an image based on the latest forest weather
function getScene(current) {
  if (current.rain > 0) return "rainy";
  if (current.cloud_cover >= 70) return "cloudy";
  return "sunny";
}

// Rain sound
function playRain() {
  rainAudio.play().then(() => {
    autoplayBlocked = false;
    updateSound();
  }).catch(() => {
    autoplayBlocked = true;
    updateSound();
  });
}

function updateSound() {
  const playing = !rainAudio.paused;
  el("sound-btn").textContent = playing ? "Pause sound Ⅱ" : "Play sound ♫";
  el("sound-btn").setAttribute("aria-pressed", String(playing));
  document.body.classList.toggle("sound-playing", playing);
  el("sound-caption").textContent = playing ? "Rain sounds are playing"
    : autoplayBlocked && visibleScene === "rainy" ? "Tap Play sound to enable audio"
    : visibleScene === "rainy" ? "Rain sound is paused"
    : "Rain plays when the forest is rainy";
}

function showScene(forceRain = false) {
  const next = mode === "live" ? (weather ? getScene(weather.current) : "sunny") : mode;
  const changed = next !== visibleScene;
  visibleScene = next;

  document.querySelectorAll(".scene").forEach((scene) => {
    scene.classList.toggle("is-visible", scene.id === "scene-" + next);
  });

  const clouds = weather ? weather.current.cloud_cover : 25;
  const night = weather && weather.current.is_day === 0;
  document.documentElement.style.setProperty("--cloud-opacity", mode === "live" ? (clouds / 500 + (night ? .15 : 0)) : (next === "cloudy" ? .2 : .05));
  document.documentElement.style.setProperty("--warmth", next === "sunny" ? .6 : 0);

  const captions = {
    sunny: ["Sunlight through the canopy", "Golden light settles among the trees.", "☀"],
    cloudy: ["Mist across the treetops", "Cool shadows soften the forest floor.", "☁"],
    rainy: ["Rain among the evergreens", "The forest turns quiet beneath the rain.", "☂"]
  };
  el("scene-description").textContent = captions[next][0];
  el("mood-description").textContent = captions[next][1];
  el("condition-icon").textContent = captions[next][2];
  el("scene-hint").textContent = mode === "live" ? "Scene follows the live weather." : "Preview mode · readings above remain live.";
  document.querySelectorAll(".scene-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.scene === mode);
    button.setAttribute("aria-pressed", String(button.dataset.scene === mode));
  });

  if (next !== "rainy") rainAudio.pause();
  if (next === "rainy" && (changed || forceRain)) playRain();
  updateSound();
}

// Get live JSON from Open-Meteo when the page loads and every 10 minutes.
async function getWeather() {
  try {
    const response = await fetch(apiURL);
    if (!response.ok) throw new Error("Weather request failed");
    const data = await response.json();
    weather = data;
    const now = data.current;
    el("temperature").textContent = Math.round(now.temperature_2m);
    el("cloud-cover").textContent = Math.round(now.cloud_cover) + "%";
    el("rain").textContent = now.rain.toFixed(1) + " mm";
    el("sun-status").textContent = now.is_day ? "Day" : "Night";
    el("condition-text").textContent = {sunny: "Clear / partly cloudy", cloudy: "Cloudy skies", rainy: "Rainfall"}[getScene(now)];
    el("updated-time").textContent = "Latest " + now.time.slice(11, 16) + " · Forest local time";
    el("data-status").textContent = "Weather connected";
    showScene();
    if (openDetail) showDetails(openDetail);
  } catch (error) {
    console.error("Could not load forest weather:", error);
    el("data-status").textContent = "Weather unavailable";
    el("condition-text").textContent = "Could not load weather";
    el("updated-time").textContent = "Check your internet connection";
  }
}

function closeDetails() {
  openDetail = "";
  el("details").hidden = true;
  el("tomorrow-btn").setAttribute("aria-expanded", "false");
  el("cloud-btn").setAttribute("aria-expanded", "false");
}

function showDetails(type) {
  openDetail = type;
  el("details").hidden = false;
  el("tomorrow-btn").setAttribute("aria-expanded", String(type === "tomorrow"));
  el("cloud-btn").setAttribute("aria-expanded", String(type === "cloud"));
  if (!weather) {
    el("detail-content").textContent = "Weather information is unavailable.";
    return;
  }
  if (type === "tomorrow") {
    const day = weather.daily;
    const date = new Date(day.time[1] + "T12:00:00").toLocaleDateString("en-CA", {weekday: "long", month: "short", day: "numeric"});
    el("detail-title").textContent = "TOMORROW'S FORECAST";
    el("detail-content").innerHTML = `
      <h3 class="details-content-head">${date}</h3>
      <div class="forecast-row">
        <div><span>HIGH</span><strong>${Math.round(day.temperature_2m_max[1])}°C</strong></div>
        <div><span>LOW</span><strong>${Math.round(day.temperature_2m_min[1])}°C</strong></div>
        <div><span>RAIN CHANCE</span><strong>${Math.round(day.precipitation_probability_max[1])}%</strong></div>
      </div><p class="detail-note">Expected rain: ${day.precipitation_sum[1].toFixed(1)} mm</p>`;
  } else {
    const clouds = Math.round(weather.current.cloud_cover);
    el("detail-title").textContent = "CLOUD COVERAGE TODAY";
    el("detail-content").innerHTML = `
      <h3 class="details-content-head">${clouds}% cloud cover</h3>
      <div class="cloud-track"><div class="cloud-progress" style="width:${clouds}%"></div></div>
      <p class="detail-note">The forest darkens as cloud cover increases.</p>`;
  }
}

el("tomorrow-btn").addEventListener("click", () => openDetail === "tomorrow" ? closeDetails() : showDetails("tomorrow"));
el("cloud-btn").addEventListener("click", () => openDetail === "cloud" ? closeDetails() : showDetails("cloud"));
el("close-details").addEventListener("click", closeDetails);
document.querySelectorAll(".scene-btn").forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.scene;
    showScene(mode === "rainy" || mode === "live"); // Rain button plays sound immediately.
  });
});

el("sound-btn").addEventListener("click", () => {
  if (rainAudio.paused) playRain();
  else rainAudio.pause();
  updateSound();
});
el("volume").addEventListener("input", () => {
  rainAudio.volume = Number(el("volume").value) / 100;
  el("volume-value").textContent = el("volume").value + "%";
});
rainAudio.addEventListener("play", updateSound);
rainAudio.addEventListener("pause", updateSound);
rainAudio.volume = .5;
showScene();
getWeather();
setInterval(getWeather, 10 * 60 * 1000);
