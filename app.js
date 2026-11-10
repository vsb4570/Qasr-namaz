
/* ==========================================
   QASR SALAH
   Complete Application JavaScript
   GPS + Manual Location + Search + Storage
========================================== */

"use strict";

// ==========================================
// 1. ELEMENTS
// ==========================================

const $ = (id) => document.getElementById(id);

const status = $("status");
const selectedAddress = $("selectedAddress");
const coords = $("coords");
const saveBtn = $("saveBtn");

const locateBtn = $("locateBtn");
const clearBtn = $("clearBtn");
const searchBtn = $("searchBtn");

const searchInput = $("search");
const placeType = $("placeType");
const savedList = $("savedList");

const madhhab = $("madhhab");
const madhhabStatus = $("madhhabStatus");

// ==========================================
// 2. STORAGE KEYS
// ==========================================

const STORAGE_KEY = "qasr-salah-addresses";
const CURRENT_LOCATION_KEY = "qasr-current-location";
const MADHHAB_KEY = "qasr-madhhab";

// ==========================================
// 3. GLOBAL VARIABLES
// ==========================================

let map = null;
let marker = null;
let selected = null;

let selectionCounter = 0;
let searchCounter = 0;

// ==========================================
// 4. STATUS MESSAGE
// ==========================================

function setStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

// ==========================================
// 5. SAFE STORAGE
// ==========================================

function storageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;

  } catch (error) {
    console.error("Storage read error:", error);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;

  } catch (error) {
    console.error("Storage write error:", error);

    setStatus(
      "তথ্য সংরক্ষণ করা যায়নি। ব্রাউজারের Storage পরীক্ষা করুন।"
    );

    return false;
  }
}

// ==========================================
// 6. CURRENT LOCATION
// ==========================================

function setCurrentLocation(location) {
  return storageSet(
    CURRENT_LOCATION_KEY,
    location
  );
}

function getCurrentLocation() {
  return storageGet(
    CURRENT_LOCATION_KEY,
    null
  );
}

// ==========================================
// 7. SAVED LOCATIONS
// ==========================================

function getSaved() {
  const saved = storageGet(
    STORAGE_KEY,
    []
  );

  return Array.isArray(saved) ? saved : [];
}

// ==========================================
// 8. MAP INITIALIZATION
// ==========================================

function initializeMap() {

  if (!$("map")) return;

  if (typeof L === "undefined") {

    setStatus(
      "মানচিত্র লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।"
    );

    return;
  }

  map = L.map("map").setView(
    [23.8103, 90.4125],
    12
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

      maxZoom: 19
    }
  ).addTo(map);

  // Tap anywhere on map

  map.on("click", async (event) => {

    setStatus(
      "নির্বাচিত স্থানের ঠিকানা খোঁজা হচ্ছে..."
    );

    await selectLocation(
      event.latlng.lat,
      event.latlng.lng,
      null,
      "manual"
    );

    setStatus(
      "ম্যানুয়াল লোকেশন নির্বাচন সম্পন্ন হয়েছে।"
    );

  });

}

// ==========================================
// 9. UPDATE MAP MARKER
// ==========================================

function updateMarker(lat, lng) {

  if (!map) return;

  const position = [
    Number(lat),
    Number(lng)
  ];

  if (marker) {

    marker.setLatLng(position);

  } else {

    marker = L.marker(
      position,
      {
        draggable: true,
        autoPan: true
      }
    ).addTo(map);

    // Drag marker

    marker.on("dragend", async () => {

      const newPosition = marker.getLatLng();

      setStatus(
        "নতুন লোকেশনের ঠিকানা খোঁজা হচ্ছে..."
      );

      await selectLocation(
        newPosition.lat,
        newPosition.lng,
        null,
        "manual"
      );

      setStatus(
        "পিন সরিয়ে নতুন লোকেশন নির্বাচন করা হয়েছে।"
      );

    });

  }

  map.setView(position, 15);
}

// ==========================================
// 10. REVERSE GEOCODING
// ==========================================

async function reverseGeocode(lat, lng) {

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=bn`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Address lookup failed");
    }

    const data = await response.json();

    return data.display_name ||
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  } catch (error) {

    console.error("Reverse geocoding error:", error);

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  }

}

// ==========================================
// 11. SELECT LOCATION
// ==========================================

async function selectLocation(
  lat,
  lng,
  address = null,
  source = "manual"
) {

  lat = Number(lat);
  lng = Number(lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {

    setStatus("সঠিক লোকেশন নির্বাচন করুন।");

    return null;
  }

  const requestId = ++selectionCounter;

  selected = {

    lat,
    lng,

    address: address || null,

    source

  };

  updateMarker(lat, lng);

  if (selectedAddress) {

    selectedAddress.textContent =
      address || "ঠিকানা খোঁজা হচ্ছে...";

  }

  if (coords) {

    coords.textContent =
      `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;

  }

  // Disable save until address is available

  if (saveBtn) {
    saveBtn.disabled = !address;
  }

  if (!address) {

    const name = await reverseGeocode(
      lat,
      lng
    );

    // Ignore outdated response

    if (requestId !== selectionCounter) {
      return null;
    }

    selected.address = name;

    if (selectedAddress) {
      selectedAddress.textContent = name;
    }

    if (saveBtn) {
      saveBtn.disabled = false;
    }

  }

  // Save current location

  setCurrentLocation(selected);

  return selected;
}

// ==========================================
// 12. GPS LOCATION
// ==========================================

if (locateBtn) {

  locateBtn.addEventListener("click", () => {

    if (!navigator.geolocation) {

      setStatus(
        "আপনার ব্রাউজারে GPS সুবিধা নেই।"
      );

      return;
    }

    setStatus("GPS লোকেশন খোঁজা হচ্ছে...");

    locateBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(

      async (position) => {

        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        await selectLocation(
          lat,
          lng,
          null,
          "gps"
        );

        setStatus(
          "আপনার বর্তমান GPS লোকেশন পাওয়া গেছে।"
        );

        locateBtn.disabled = false;

      },

      (error) => {

        const messages = {

          1: "লোকেশন অনুমতি দেওয়া হয়নি। Location Allow করুন।",

          2: "বর্তমানে GPS লোকেশন পাওয়া যাচ্ছে না।",

          3: "GPS খুঁজতে সময় শেষ হয়েছে। আবার চেষ্টা করুন।"

        };

        setStatus(
          messages[error.code] ||
          "GPS-এ সমস্যা হয়েছে।"
        );

        locateBtn.disabled = false;

      },

      {

        enableHighAccuracy: true,

        timeout: 20000,

        maximumAge: 0

      }

    );

  });

}

// ==========================================
// 13. SEARCH LOCATION
// ==========================================

async function searchLocation() {

  const query = searchInput
    ? searchInput.value.trim()
    : "";

  if (!query) {

    setStatus("আগে একটি ঠিকানা লিখুন।");

    return;
  }

  const requestId = ++searchCounter;

  if (searchBtn) {
    searchBtn.disabled = true;
  }

  setStatus("ঠিকানা খোঁজা হচ্ছে...");

  try {

    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=bn&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const results = await response.json();

    // Ignore outdated search

    if (requestId !== searchCounter) {
      return;
    }

    if (!results.length) {

      setStatus(
        "কোনো ঠিকানা পাওয়া যায়নি। অন্য নামে চেষ্টা করুন।"
      );

      return;
    }

    const place = results[0];

    await selectLocation(

      Number(place.lat),

      Number(place.lon),

      place.display_name,

      "manual"

    );

    setStatus("ঠিকানা পাওয়া গেছে।");

  } catch (error) {

    console.error("Search error:", error);

    setStatus(
      "ঠিকানা খুঁজতে সমস্যা হয়েছে। ইন্টারনেট পরীক্ষা করুন।"
    );

  } finally {

    if (searchBtn) {
      searchBtn.disabled = false;
    }

  }

}

if (searchBtn) {

  searchBtn.addEventListener(
    "click",
    searchLocation
  );

}

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {

        event.preventDefault();

        searchLocation();

      }

    }
  );

}

// ==========================================
// 14. SAVE LOCATION
// ==========================================

if (saveBtn) {

  saveBtn.addEventListener("click", () => {

    if (
      !selected ||
      !selected.address
    ) {

      setStatus(
        "আগে একটি সঠিক লোকেশন নির্বাচন করুন।"
      );

      return;
    }

    const type = placeType
      ? placeType.value
      : "other";

    const typeName = placeType
      ? placeType.selectedOptions[0].textContent
      : "অন্যান্য";

    const item = {

      id: Date.now(),

      lat: selected.lat,

      lng: selected.lng,

      address: selected.address,

      source: selected.source,

      type,

      typeName,

      savedAt: new Date().toISOString()

    };

    const saved = getSaved();

    // Update same type instead of duplicate

    const existingIndex = saved.findIndex(
      (location) => location.type === type
    );

    if (existingIndex >= 0) {

      saved[existingIndex] = item;

    } else {

      saved.push(item);

    }

    if (!storageSet(STORAGE_KEY, saved)) {
      return;
    }

    if (!setCurrentLocation(item)) {
      return;
    }

    selected = item;

    renderSaved();

    saveBtn.disabled = true;

    setStatus(
      `${typeName} সফলভাবে সংরক্ষণ হয়েছে।`
    );

  });

}

// ==========================================
// 15. RENDER SAVED LOCATIONS
// ==========================================

function renderSaved() {

  if (!savedList) return;

  savedList.replaceChildren();

  const saved = getSaved();

  if (saved.length === 0) {

    const message = document.createElement("p");

    message.className = "muted";

    message.textContent =
      "এখনো কোনো ঠিকানা সংরক্ষণ করা হয়নি।";

    savedList.appendChild(message);

    return;
  }

  saved.forEach((item) => {

    const wrapper = document.createElement("div");

    wrapper.className = "saved-item";

    const button = document.createElement("button");

    button.type = "button";

    button.className = "secondary";

    button.textContent =
      `${item.typeName || item.type || "লোকেশন"}: ${item.address}`;

    button.addEventListener("click", async () => {

      if (placeType && item.type) {
        placeType.value = item.type;
      }

      await selectLocation(

        item.lat,

        item.lng,

        item.address,

        "saved"

      );

      setStatus(
        "সংরক্ষিত লোকেশন নির্বাচন করা হয়েছে।"
      );

    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className = "secondary";

    deleteButton.textContent = "মুছুন";

    deleteButton.style.marginTop = "5px";

    deleteButton.addEventListener("click", () => {

      const updated = getSaved().filter(
        (location) => location.id !== item.id
      );

      storageSet(STORAGE_KEY, updated);

      renderSaved();

      setStatus("ঠিকানা মুছে ফেলা হয়েছে।");

    });

    wrapper.appendChild(button);

    wrapper.appendChild(deleteButton);

    savedList.appendChild(wrapper);

  });

}

// ==========================================
// 16. CLEAR ALL LOCATIONS
// ==========================================

if (clearBtn) {

  clearBtn.addEventListener("click", () => {

    if (
      !confirm(
        "সব সংরক্ষিত ঠিকানা এবং বর্তমান লোকেশন মুছে ফেলবেন?"
      )
    ) {

      return;
    }

    localStorage.removeItem(STORAGE_KEY);

    localStorage.removeItem(
      CURRENT_LOCATION_KEY
    );

    selected = null;

    selectionCounter++;

    searchCounter++;

    if (selectedAddress) {

      selectedAddress.textContent =
        "এখনো কোনো ঠিকানা নির্বাচন করা হয়নি।";

    }

    if (coords) {
      coords.textContent = "";
    }

    if (saveBtn) {
      saveBtn.disabled = true;
    }

    if (marker && map) {

      map.removeLayer(marker);

      marker = null;

    }

    renderSaved();

    setStatus(
      "সব সংরক্ষিত ঠিকানা ও বর্তমান লোকেশন মুছে ফেলা হয়েছে।"
    );

  });

}

// ==========================================
// 17. MADHHAB PREFERENCE
// ==========================================

if (madhhab) {

  const savedMadhhab = localStorage.getItem(
    MADHHAB_KEY
  );

  if (
    savedMadhhab &&
    [...madhhab.options].some(
      option => option.value === savedMadhhab
    )
  ) {

    madhhab.value = savedMadhhab;

  }

  function updateMadhhabStatus() {

    if (madhhabStatus) {

      madhhabStatus.textContent =
        "নির্বাচিত মাজহাব: " + madhhab.value;

    }

  }

  madhhab.addEventListener("change", () => {

    localStorage.setItem(
      MADHHAB_KEY,
      madhhab.value
    );

    updateMadhhabStatus();

  });

  updateMadhhabStatus();

}

// ==========================================
// 18. RESTORE PREVIOUS LOCATION
// ==========================================

async function restoreCurrentLocation() {

  const previousLocation = getCurrentLocation();

  if (!previousLocation) return;

  const lat = Number(previousLocation.lat);

  const lng = Number(previousLocation.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return;
  }

  await selectLocation(

    lat,

    lng,

    previousLocation.address || null,

    previousLocation.source || "saved"

  );

  setStatus(
    "আগের নির্বাচিত লোকেশন পুনরুদ্ধার হয়েছে।"
  );

}

// ==========================================
// 19. INITIALIZE APPLICATION
// ==========================================

function initializeApp() {

  initializeMap();

  renderSaved();

  restoreCurrentLocation();

  console.log(
    "Qasr Salah application initialized successfully."
  );

}

// ==========================================
// 20. START APPLICATION
// ==========================================

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();

  }
    
