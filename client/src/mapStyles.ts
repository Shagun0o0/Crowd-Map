import L from "leaflet";

// 🌞 Light Theme
export const lightMap = () =>
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  });

// 🌙 Dark Theme
export const darkMap = () =>
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap & Carto",
    }
  );

// 🌍 Satellite Theme
export const satelliteMap = () =>
  L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenTopoMap",
    }
  );