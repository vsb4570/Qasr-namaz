
"use strict";

/* ==========================================
   QASR NAMAZ
   COMPLETE MAP & ADDRESS SYSTEM
   Street + Satellite + GPS + PWA
========================================== */

// ==========================================
// 1. ELEMENT SELECTOR
// ==========================================

const $ = (id) => document.getElementById(id);

// ==========================================
// 2. STORAGE
// ==========================================

const STORAGE = {
  home: "qasr_home_address",
  current: "qasr_current_address",
  madhhab: "qasr_madhhab"
};

// ==========================================
// 3. GLOBAL VARIABLES
// ==========================================

let map = null;
let marker = null;
let selected = null;

let selectionVersion = 0;

let streetLayer = null;
let satelliteLayer = null;
let satelliteLabels = null;

let currentPosition = {
  lat: 23.8103,
  lng: 90.4125
};

// ==========================================
// 4. STATUS MESSAGE
// ==========================================

function showStatus(message, error = false) {

  const element = $("status");

  if (!element) return;

  element.textContent = message;

  element.style.color = error
    ? "#c0392b"
    : "#087b50";
}

// ==========================================
// 5. MAP INITIALIZATION
// ==========================================

function initMap() {

  if (!window.L) {

    showStatus(
      "Leaflet Map লোড হয়নি। ইন্টারনেট পরীক্ষা করুন।",
      true
    );

    return;
  }

  // Create map

  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView(
    [
      currentPosition.lat,
      currentPosition.lng
    ],
    13
  );

  // ========================================
  // STREET MAP
  // ========================================

  streetLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      minZoom: 1,
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );

  // ========================================
  // SATELLITE MAP
  // ========================================

  satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      minZoom: 1,
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri"
    }
  );

  // ========================================
  // SATELLITE LABELS
  // ========================================

  satelliteLabels = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      opacity: 0.9,
      attribution:
        "Labels &copy; Esri"
    }
  );

  // Default map

  streetLayer.addTo(map);

  // ========================================
  // MAP LAYER CONTROL
  // ========================================

  const baseMaps = {

    "Street Map": streetLayer,

    "Satellite Map": satelliteLayer

  };

  const overlayMaps = {

    "Satellite Place Labels": satelliteLabels

  };

  L.control.layers(
    baseMaps,
    overlayMaps,
    {
      collapsed: false
    }
  ).addTo(map);

  // ========================================
  // MAP MARKER
  // ========================================

  marker = L.marker(
    [
      currentPosition.lat,
      currentPosition.lng
    ],
    {
      draggable: true,
      autoPan: true
    }
  ).addTo(map);

  marker.bindPopup(
    "আপনার ঠিকানা নির্বাচন করুন"
  );

  // ========================================
  // MAP CLICK EVENT
  // ========================================

  map.on("click", function(event) {

    selectLocation(
      event.latlng.lat,
      event.latlng.lng
    );

  });

  // ========================================
  // MARKER DRAG EVENT
  // ========================================

  marker.on("dragend", function() {

    const position = marker.getLatLng();

    selectLocation(
      position.lat,
      position.lng
    );

  });

  // ========================================
  // MAP READY
  // ========================================

  restoreAddresses();

  const home = getSavedAddress("home");

  const current = getSavedAddress("current");

  const saved = home || current;

  if (saved) {

    selectLocation(
      saved.lat,
      saved.lng,
      false,
      saved.address
    );

  }

  showStatus(
    "Street ও Satellite Map প্রস্তুত।"
  );

  setTimeout(() => {

    map.invalidateSize();

  }, 400);

}

// ==========================================
// 6. SELECT LOCATION
// ==========================================

async function selectLocation(
  lat,
  lng,
  reverse = true,
  savedAddress = ""
) {

  if (!map || !marker) return;

  const version = ++selectionVersion;

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

    showStatus(
      "সঠিক লোকেশন নির্বাচন করুন।",
      true
    );

    return;
  }

  selected = {

    lat: lat,

    lng: lng,

    address:
      savedAddress || "ঠিকানা খোঁজা হচ্ছে..."

  };

  currentPosition = {
    lat,
    lng
  };

  marker.setLatLng([lat, lng]);

  map.setView([lat, lng], 17);

  updateSelectedAddress();

  marker.openPopup();

  if (reverse) {

    await reverseGeocode(
      lat,
      lng,
      version
    );

  }

}

// ==========================================
// 7. UPDATE SELECTED ADDRESS
// ==========================================

function updateSelectedAddress() {

  if (!selected) return;

  $("selectedAddress").textContent =
    selected.address;

  $("coords").textContent =

    "Latitude: " +
    selected.lat.toFixed(6) +

    " | Longitude: " +
    selected.lng.toFixed(6);

}

// ==========================================
// 8. REVERSE GEOCODING
// ==========================================

async function reverseGeocode(
  lat,
  lng,
  version
) {

  try {

    const url =

      "https://photon.komoot.io/reverse?" +

      "lat=" +
      encodeURIComponent(lat) +

      "&lon=" +
      encodeURIComponent(lng);

    const response = await fetch(url);

    if (!response.ok) {

      throw new Error(
        "Address service unavailable"
      );

    }

    const data = await response.json();

    if (version !== selectionVersion) return;

    if (
      data.features &&
      data.features.length > 0
    ) {

      const properties =
        data.features[0].properties;

      selected.address =
        formatAddress(properties);

      updateSelectedAddress();

      showStatus(
        "ঠিকানা সফলভাবে শনাক্ত হয়েছে।"
      );

    } else {

      selected.address =
        lat.toFixed(6) +
        ", " +
        lng.toFixed(6);

      updateSelectedAddress();

      showStatus(
        "স্থানাঙ্ক পাওয়া গেছে।"
      );

    }

  } catch (error) {

    if (version !== selectionVersion) return;

    selected.address =
      lat.toFixed(6) +
      ", " +
      lng.toFixed(6);

    updateSelectedAddress();

    showStatus(
      "ঠিকানার নাম পাওয়া যায়নি। স্থানাঙ্ক সংরক্ষণ করতে পারবেন।",
      true
    );

  }

}

// ==========================================
// 9. FORMAT ADDRESS
// ==========================================

function formatAddress(p) {

  const fields = [

    p.name,

    p.housenumber,

    p.street,

    p.suburb,

    p.district,

    p.city,

    p.state,

    p.country

  ];

  const unique = [];

  fields.forEach(value => {

    if (
      value &&
      !unique.includes(value)
    ) {

      unique.push(value);

    }

  });

  return unique.length
    ? unique.join(", ")
    : "ঠিকানা পাওয়া যায়নি";

}

// ==========================================
// 10. SEARCH ADDRESS
// ==========================================

async function searchAddress() {

  const input = $("searchAddress");

  const query = input.value.trim();

  const resultsBox = $("searchResults");

  if (!query) {

    showStatus(
      "অনুগ্রহ করে ঠিকানা লিখুন।",
      true
    );

    return;
  }

  resultsBox.replaceChildren();

  showStatus(
    "ঠিকানা খোঁজা হচ্ছে..."
  );

  try {

    const url =

      "https://photon.komoot.io/api/?" +

      "q=" +
      encodeURIComponent(query) +

      "&limit=5";

    const response = await fetch(url);

    if (!response.ok) {

      throw new Error(
        "Search service unavailable"
      );

    }

    const data = await response.json();

    const features = data.features || [];

    if (features.length === 0) {

      showStatus(
        "কোনো ঠিকানা পাওয়া যায়নি।",
        true
      );

      return;
    }

    features.forEach(feature => {

      const p = feature.properties;

      const coordinates =
        feature.geometry.coordinates;

      const lng = coordinates[0];

      const lat = coordinates[1];

      const button =
        document.createElement("button");

      button.type = "button";

      button.className = "result-item";

      button.textContent =
        formatAddress(p);

      button.addEventListener(
        "click",
        () => {

          resultsBox.replaceChildren();

          input.value =
            formatAddress(p);

          selectLocation(lat, lng);

        }
      );

      resultsBox.appendChild(button);

    });

    showStatus(
      "ঠিকানা পাওয়া গেছে। একটি নির্বাচন করুন।"
    );

  } catch (error) {

    showStatus(
      "ঠিকানা সার্চ করতে সমস্যা হয়েছে। ইন্টারনেট পরীক্ষা করুন।",
      true
    );

  }

}

// ==========================================
// 11. GPS CURRENT LOCATION
// ==========================================

function getCurrentLocation() {

  if (!navigator.geolocation) {

    showStatus(
      "আপনার ব্রাউজারে GPS সমর্থিত নয়।",
      true
    );

    return;

  }

  showStatus(
    "আপনার বর্তমান লোকেশন খোঁজা হচ্ছে..."
  );

  navigator.geolocation.getCurrentPosition(

    async function(position) {

      const lat =
        position.coords.latitude;

      const lng =
        position.coords.longitude;

      $("saveAs").value = "current";

      // Wait until address lookup completes

      await selectLocation(lat, lng);

      // Save GPS as current address

      saveAddress("current");

      showStatus(
        "বর্তমান লোকেশন সংরক্ষিত হয়েছে।"
      );

    },

    function(error) {

      let errorMessage =
        "লোকেশন পাওয়া যায়নি।";

      if (error.code === 1) {

        errorMessage =
          "লোকেশন ব্যবহারের অনুমতি দিন।";

      } else if (error.code === 2) {

        errorMessage =
          "GPS সিগন্যাল পাওয়া যাচ্ছে না।";

      } else if (error.code === 3) {

        errorMessage =
          "লোকেশন খুঁজতে সময় শেষ হয়েছে।";

      }

      showStatus(
        errorMessage,
        true
      );

    },

    {

      enableHighAccuracy: true,

      timeout: 20000,

      maximumAge: 0

    }

  );

}

// ==========================================
// 12. SAVE ADDRESS
// ==========================================

function saveAddress(type) {

  if (!selected) {

    showStatus(
      "প্রথমে ম্যাপে ঠিকানা নির্বাচন করুন।",
      true
    );

    return false;

  }

  const addressData = {

    lat: selected.lat,

    lng: selected.lng,

    address:
      selected.address ||
      selected.lat + ", " + selected.lng,

    updatedAt: new Date().toISOString()

  };

  try {

    localStorage.setItem(

      STORAGE[type],

      JSON.stringify(addressData)

    );

    restoreAddresses();

    showStatus(

      type === "home"

        ? "স্থায়ী ঠিকানা সংরক্ষণ হয়েছে।"

        : "বর্তমান ঠিকানা সংরক্ষণ হয়েছে।"

    );

    return true;

  } catch (error) {

    showStatus(
      "ঠিকানা সংরক্ষণ করা যায়নি।",
      true
    );

    return false;

  }

}

// ==========================================
// 13. GET SAVED ADDRESS
// ==========================================

function getSavedAddress(type) {

  try {

    const data =
      localStorage.getItem(STORAGE[type]);

    if (!data) return null;

    const parsed = JSON.parse(data);

    if (

      !Number.isFinite(parsed.lat) ||

      !Number.isFinite(parsed.lng) ||

      parsed.lat < -90 ||

      parsed.lat > 90 ||

      parsed.lng < -180 ||

      parsed.lng > 180

    ) {

      return null;

    }

    return parsed;

  } catch (error) {

    return null;

  }

}

// ==========================================
// 14. RESTORE SAVED ADDRESSES
// ==========================================

function restoreAddresses() {

  const home =
    getSavedAddress("home");

  const current =
    getSavedAddress("current");

  $("homeAddress").textContent = home

    ? home.address +
      " | " +
      home.lat.toFixed(6) +
      ", " +
      home.lng.toFixed(6)

    : "কোনো স্থায়ী ঠিকানা সংরক্ষিত নেই।";

  $("currentAddress").textContent = current

    ? current.address +
      " | " +
      current.lat.toFixed(6) +
      ", " +
      current.lng.toFixed(6)

    : "কোনো বর্তমান ঠিকানা সংরক্ষিত নেই।";

  const madhhab =
    localStorage.getItem(STORAGE.madhhab);

  if (
    madhhab &&
    $("madhhab")
  ) {

    $("madhhab").value = madhhab;

  }

}

// ==========================================
// 15. SHOW SAVED ADDRESS ON MAP
// ==========================================

function showSavedLocation(type) {

  const data =
    getSavedAddress(type);

  if (!data) {

    showStatus(
      "এই ঠিকানা সংরক্ষিত নেই।",
      true
    );

    return;

  }

  selectLocation(

    data.lat,

    data.lng,

    false,

    data.address

  );

  showStatus(

    type === "home"

      ? "স্থায়ী ঠিকানা ম্যাপে দেখানো হচ্ছে।"

      : "বর্তমান ঠিকানা ম্যাপে দেখানো হচ্ছে।"

  );

}

// ==========================================
// 16. DELETE ADDRESS
// ==========================================

function deleteAddress(type) {

  const data =
    getSavedAddress(type);

  if (!data) {

    showStatus(
      "মুছে ফেলার মতো ঠিকানা নেই।",
      true
    );

    return;

  }

  const confirmed = confirm(

    type === "home"

      ? "স্থায়ী ঠিকানা মুছে ফেলবেন?"

      : "বর্তমান ঠিকানা মুছে ফেলবেন?"

  );

  if (!confirmed) return;

  localStorage.removeItem(
    STORAGE[type]
  );

  restoreAddresses();

  showStatus(
    "ঠিকানা মুছে ফেলা হয়েছে।"
  );

}

// ==========================================
// 17. MADHHAB STORAGE
// ==========================================

function saveMadhhab() {

  const value = $("madhhab").value;

  try {

    localStorage.setItem(
      STORAGE.madhhab,
      value
    );

    showStatus(
      "মাযহাব সংরক্ষণ হয়েছে।"
    );

  } catch (error) {

    showStatus(
      "মাযহাব সংরক্ষণ করা যায়নি।",
      true
    );

  }

}

// ==========================================
// 18. BUTTON EVENTS
// ==========================================

function setupEvents() {

  $("searchBtn").addEventListener(
    "click",
    searchAddress
  );

  $("searchAddress").addEventListener(
    "keydown",
    function(event) {

      if (event.key === "Enter") {

        event.preventDefault();

        searchAddress();

      }

    }
  );

  $("gpsBtn").addEventListener(
    "click",
    getCurrentLocation
  );

  $("saveBtn").addEventListener(
    "click",
    function() {

      saveAddress(
        $("saveAs").value
      );

    }
  );

  $("selectHomeBtn").addEventListener(
    "click",
    function() {

      showSavedLocation("home");

    }
  );

  $("selectCurrentBtn").addEventListener(
    "click",
    function() {

      showSavedLocation("current");

    }
  );

  $("deleteHomeBtn").addEventListener(
    "click",
    function() {

      deleteAddress("home");

    }
  );

  $("deleteCurrentBtn").addEventListener(
    "click",
    function() {

      deleteAddress("current");

    }
  );

  $("madhhab").addEventListener(
    "change",
    saveMadhhab
  );

}

// ==========================================
// 19. SERVICE WORKER REGISTRATION
// ==========================================

async function registerServiceWorker() {

  if (!("serviceWorker" in navigator)) {

    console.log(
      "Service Worker not supported."
    );

    return;

  }

  try {

    const registration =

      await navigator.serviceWorker.register(
        "./service-worker.js"
      );

    console.log(
      "Service Worker registered:",
      registration.scope
    );

    await registration.update();

  } catch (error) {

    console.error(
      "Service Worker registration failed:",
      error
    );

  }

}

// ==========================================
// 20. APPLICATION START
// ==========================================

function startApp() {

  setupEvents();

  initMap();

  registerServiceWorker();

}

// ==========================================
// RUN
// ==========================================

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();

}
