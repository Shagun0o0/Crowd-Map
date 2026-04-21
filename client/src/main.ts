import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet-routing-machine";
import { io } from "socket.io-client";
import "./style.css";
import { lightMap, darkMap, satelliteMap } from "./mapStyles";

const socket = io();

// ================= APP =================
const app = document.querySelector<HTMLDivElement>("#app")!;

// ================= UI =================
app.innerHTML = `
  <div class="top-ui">
    <div class="search-box">
      <input id="search" placeholder="Search place..." />
      <div id="suggestions"></div>
    </div>

    <button id="goBtn">🔍</button>
    <button id="locBtn">📍</button>
    <button id="navBtn">Start ▶️</button>
    <button id="themeBtn">🎨</button>
    <button id="exploreBtn">✨</button>
  </div>

  <div id="loading">
    <div class="loader-box">
      <div class="spinner"></div>
      <div>Loading map...</div>
    </div>
  </div>

  <div id="map"></div>

  <div id="bottomSheet">
    <div id="dragHandle"></div>
    <div id="routeMain">🧭 No route</div>
    <div id="routeSub">Search or tap map</div>
  </div>
`;

// ================= MAP =================
const map = L.map("map", {
  preferCanvas: true,
  zoomControl: true,
}).setView([30.9, 75.8], 12);

let currentLayer = lightMap().addTo(map);
let currentTheme = "light";

map.whenReady(() => {
  document.getElementById("loading")!.style.display = "none";
});

// ================= STATE =================
let myLocation = { lat: 0, lng: 0 };
let myMarker: any;
let routingControl: any;
let heatLayer: any;

let isNavigating = false;
let isFollowing = true;

// ================= BLUE DOT =================
const blueDot = L.divIcon({
  className: "",
  html: `<div class="user-location"></div>`,
  iconSize: [20, 20],
});

// ================= SOCKET =================
socket.on("all-locations", (users: any[]) => {
  const points = users.map((u) => [u.lat, u.lng, 1]);

  if (!heatLayer) {
    heatLayer = (L as any).heatLayer(points, {
      radius: 35,
      blur: 20,
    }).addTo(map);
  } else {
    heatLayer.setLatLngs(points);
  }
});

// ================= ROUTING =================
function createRoute(lat: number, lng: number) {
  if (!myLocation.lat) return alert("Waiting for location...");

  if (routingControl) map.removeControl(routingControl);

  routingControl = (L as any).Routing.control({
    waypoints: [
      L.latLng(myLocation.lat, myLocation.lng),
      L.latLng(lat, lng),
    ],
    show: false,
    createMarker: () => null,
    lineOptions: {
      styles: [{ color: "#1e90ff", weight: 6 }],
    },
  }).addTo(map);

  setTimeout(() => {
    document.querySelector(".leaflet-routing-container")?.remove();
  }, 100);

  routingControl.on("routesfound", (e: any) => {
    const r = e.routes[0];

    document.getElementById("routeMain")!.innerText =
      `${(r.summary.totalDistance / 1000).toFixed(1)} km • ${
        (r.summary.totalTime / 60).toFixed(0)
      } min`;

    document.getElementById("routeSub")!.innerText = "Best route 🚀";
  });
}

// ================= SEARCH =================
document.getElementById("goBtn")!.onclick = async () => {
  const q = (document.getElementById("search") as HTMLInputElement).value;
  if (!q) return;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${q}`
  );
  const data = await res.json();

  if (!data.length) return alert("Place not found");

  createRoute(parseFloat(data[0].lat), parseFloat(data[0].lon));
};

// ================= SUGGESTIONS =================
const searchInput = document.getElementById("search") as HTMLInputElement;
const suggestionBox = document.getElementById("suggestions")!;

let debounceTimer: any;

searchInput.addEventListener("input", () => {
  const query = searchInput.value;

  clearTimeout(debounceTimer);

  if (!query) {
    suggestionBox.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(async () => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    const data = await res.json();

    suggestionBox.innerHTML = "";

    data.slice(0, 5).forEach((place: any) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.innerText = place.display_name;

      div.onclick = () => {
        searchInput.value = place.display_name;
        suggestionBox.innerHTML = "";
        createRoute(parseFloat(place.lat), parseFloat(place.lon));
      };

      suggestionBox.appendChild(div);
    });
  }, 300);
});

// ================= BUTTONS =================
document.getElementById("locBtn")!.onclick = () => {
  if (!myLocation.lat) return;
  isFollowing = true;
  map.flyTo([myLocation.lat, myLocation.lng], 16);
};

document.getElementById("navBtn")!.onclick = () => {
  isNavigating = !isNavigating;
  isFollowing = isNavigating;

  const btn = document.getElementById("navBtn")!;
  btn.textContent = isNavigating ? "Stop ⛔" : "Start ▶️";
};

document.getElementById("themeBtn")!.onclick = () => {
  map.removeLayer(currentLayer);

  if (currentTheme === "light") {
    currentLayer = darkMap().addTo(map);
    currentTheme = "dark";
  } else if (currentTheme === "dark") {
    currentLayer = satelliteMap().addTo(map);
    currentTheme = "satellite";
  } else {
    currentLayer = lightMap().addTo(map);
    currentTheme = "light";
  }
};

// ================= EXPLORE =================
document.getElementById("exploreBtn")!.onclick = async () => {
  if (!myLocation.lat) return alert("Waiting for location...");

  const query = `
    [out:json];
    (
      node["amenity"="cafe"](around:1000,${myLocation.lat},${myLocation.lng});
      node["amenity"="restaurant"](around:1000,${myLocation.lat},${myLocation.lng});
      node["tourism"="attraction"](around:1000,${myLocation.lat},${myLocation.lng});
      node["amenity"="hospital"](around:1000,${myLocation.lat},${myLocation.lng});
    );
    out;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  const data = await res.json();

  data.elements.slice(0, 10).forEach((place: any) => {
    const lat = place.lat;
    const lng = place.lon;
    const name = place.tags?.name || "Place";

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(name);

    marker.on("click", () => {
      createRoute(lat, lng);
    });
  });
};

// ================= MAP =================
map.on("click", (e: any) => {
  createRoute(e.latlng.lat, e.latlng.lng);
});

map.on("dragstart", () => {
  isFollowing = false;
});

// ================= TRACKING =================
let lastUpdate = 0;

navigator.geolocation.watchPosition(
  (pos) => {
    const now = Date.now();
    if (now - lastUpdate < 1000) return;
    lastUpdate = now;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    myLocation = { lat, lng };

    if (myMarker) {
      myMarker.setLatLng([lat, lng]);
    } else {
      myMarker = L.marker([lat, lng], { icon: blueDot }).addTo(map);
    }

    if (isFollowing) {
      map.setView([lat + 0.0005, lng], 17);
    }

    socket.emit("send-location", { lat, lng });
  },
  console.error,
  { enableHighAccuracy: true }
);

// ================= SERVICE WORKER =================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("SW registered 🔥"))
      .catch(console.error);
  });
}

// ================= INSTALL =================
let deferredPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("INSTALL READY 🔥");

  const btn = document.createElement("button");
  btn.innerText = "Install App 📱";

  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.padding = "12px 18px";
  btn.style.background = "#ff4757";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "12px";
  btn.style.zIndex = "9999";

  document.body.appendChild(btn);

  btn.onclick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  };
});