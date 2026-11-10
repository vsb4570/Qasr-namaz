
"use strict";

// ===================================
// QASR NAMAZ MAP SYSTEM
// STREET + SATELLITE
// ===================================

const $ = id => document.getElementById(id);

const STORAGE = {
  home: "qasr_home_address",
  current: "qasr_current_address",
  madhhab: "qasr_madhhab"
};

let map;
let marker;
let selected = null;
let selectionVersion = 0;

let currentPosition = {
  lat: 23.8103,
  lng: 90.4125
};

// ===================================
// STATUS
// ===================================

function message(text, error = false) {
  $("status").textContent = text;
  $("status").style.color =
    error ? "#c0392b" : "#087b50";
}

// ===================================
// MAP INITIALIZATION
// ===================================

function initMap() {

  if (!window.L) {
    message("ম্যাপ লাইব্রেরি লোড হয়নি।", true);
    return;
  }

  map = L.map("map", {
    zoomControl: true
  }).setView(
    [currentPosition.lat, currentPosition.lng],
    13
  );

  // STREET MAP

  const street = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );

  // SATELLITE MAP

  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        'Tiles &copy; Esri'
    }
  );

  // SATELLITE PLACE LABELS

  const satelliteLabels = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      opacity: 0.9,
      attribution:
        'Labels &copy; Esri'
    }
  );

  // DEFAULT STREET MAP

  street.addTo(map);

  // LAYER SWITCHER

  const baseMaps = {
    "🗺️ Street Map": street,
    "🛰️ Satellite Map": satellite
  };

  L.control.layers(
    baseMaps,
    {
      "স্থাননাম ও সীমানা": satelliteLabels
    },
    {
      collapsed: false
    }
  ).addTo(map);

  // MARKER

  marker = L.marker(
    [currentPosition.lat, currentPosition.lng],
    {
      draggable: true
    }
  ).addTo(map);

  marker.bindPopup("ঠিকানা নির্বাচন করুন");

  // MAP CLICK

  map.on("click", function(event) {

    selectLocation(
      event.latlng.lat,
      event.latlng.lng
    );

  });

  // MARKER DRAG

  marker.on("dragend", function() {

    const p = marker.getLatLng();

    selectLocation(p.lat, p.lng);

  });

  restoreAddresses();

  const home = getSaved("home");
  const current = getSaved("current");

  const saved = home || current;

  if (saved) {
    selectLocation(
      saved.lat,
      saved.lng,
      false,
      saved.address
    );
  }

  message("Street ও Satellite Map প্রস্তুত।");

  setTimeout(() => map.invalidateSize(), 300);
}

// ===================================
// SELECT LOCATION
// ===================================

async function selectLocation(
  lat,
  lng,
  reverse = true,
  savedAddress = ""
) {

  selectionVersion++;

  const version = selectionVersion;

  selected = {
    lat: Number(lat),
    lng: Number(lng),
    address: savedAddress || "ঠিকানা খোঁজা হচ্ছে..."
  };

  currentPosition = {
    lat: selected.lat,
    lng: selected.lng
  };

  marker.setLatLng([lat, lng]);

  map.setView([lat, lng], 17);

  $("selectedAddress").textContent =
    selected.address;

  $("coords").textContent =
    "Latitude: " + lat.toFixed(6) +
    " | Longitude: " + lng.toFixed(6);

  if (reverse) {
    await reverseGeocode(lat, lng, version);
  }
}

// ===================================
// REVERSE GEOCODING
// PHOTON OPEN GEOCODER
// ===================================

async function reverseGeocode(lat, lng, version) {

  try {

    const url =
      "https://photon.komoot.io/reverse?" +
      "lat=" + encodeURIComponent(lat) +
      "&lon=" + encodeURIComponent(lng);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Address service error");
    }

    const data = await response.json();

    if (version !== selectionVersion) return;

    if (
      data.features &&
      data.features.length > 0
    ) {

      const address = formatAddress(
        data.features[0].properties
      );

      selected.address = address;

      $("selectedAddress").textContent = address;

      message("ঠিকানা পাওয়া গেছে।");

    } else {

      selected.address =
        lat.toFixed(6) + ", " + lng.toFixed(6);

      $("selectedAddress").textContent =
        selected.address;

      message("স্থানাঙ্ক পাওয়া গেছে।");

    }

  } catch (error) {

    if (version !== selectionVersion) return;

    selected.address =
      lat.toFixed(6) + ", " + lng.toFixed(6);

    $("selectedAddress").textContent =
      selected.address;

    message(
      "ঠিকানার নাম পাওয়া যায়নি। স্থানাঙ্ক সংরক্ষণ করতে পারবেন।",
      true
    );
  }
}

// ===================================
// FORMAT ADDRESS
// ===================================

function formatAddress(p) {

  const parts = [
    p.name,
    p.street,
    p.district,
    p.city,
    p.state,
    p.country
  ];

  const unique = [...new Set(
    parts.filter(Boolean)
  )];

  return unique.join(", ") || "ঠিকানা পাওয়া যায়নি";
}

// ===================================
// SEARCH LOCATION
// ===================================

async function searchAddress() {

  const query = $("searchAddress").value.trim();

  if (!query) {
    message("ঠিকানা লিখুন।", true);
    return;
  }

  message("ঠিকানা খোঁজা হচ্ছে...");

  $("searchResults").replaceChildren();

  try {

    const url =
      "https://photon.komoot.io/api/?" +
      "q=" + encodeURIComponent(query) +
      "&limit=5";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();

    const results = data.features || [];

    if (!results.length) {
      message("কোনো ঠিকানা পাওয়া যায়নি।", true);
      return;
    }

    results.forEach(feature => {

      const p = feature.properties;

      const coords = feature.geometry.coordinates;

      const lat = coords[1];
      const lng = coords[0];

      const button = document.createElement("button");

      button.className = "result-item";

      button.textContent = formatAddress(p);

      button.addEventListener("click", () => {

        $("searchResults").replaceChildren();

        selectLocation(lat, lng);

      });

      $("searchResults").appendChild(button);

    });

    message("নিচে পাওয়া ঠিকানাগুলো দেখুন।");

  } catch (error) {

    message(
      "ঠিকানা খুঁজতে সমস্যা হয়েছে। ইন্টারনেট পরীক্ষা করুন।",
      true
    );

  }
}

// ===================================
// GPS LOCATION
// ===================================

function getCurrentLocation() {

  if (!navigator.geolocation) {
    message("আপনার ডিভাইসে GPS সমর্থিত নয়।", true);
    return;
  }

  message("বর্তমান লোকেশন খোঁজা হচ্ছে...");

  navigator.geolocation.getCurrentPosition(

    async position => {

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      $("saveAs").value = "current";

      await selectLocation(lat, lng);

      // Automatically save GPS as current address
      saveAddress("current");

      message("বর্তমান লোকেশন সংরক্ষিত হয়েছে।");

    },

    error => {

      let msg = "লোকেশন পাওয়া যায়নি।";

      if (error.code === 1) {
        msg = "লোকেশন ব্যবহারের অনুমতি দিন।";
      }

      if (error.code === 2) {
        msg = "GPS সিগন্যাল পাওয়া যাচ্ছে না।";
      }

      if (error.code === 3) {
        msg = "GPS খুঁজতে সময় শেষ হয়েছে।";
      }

      message(msg, true);

    },

    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }

  );
}

// ===================================
// SAVE ADDRESS
// ===================================

function saveAddress(type) {

  if (!selected) {
    message("প্রথমে ম্যাপে ঠিকানা নির্বাচন করুন।", true);
    return;
  }

  const data = {
    lat: selected.lat,
    lng: selected.lng,
    address: selected.address
  };

  try {

    localStorage.setItem(
      STORAGE[type],
      JSON.stringify(data)
    );

    restoreAddresses();

    message(
      type === "home"
        ? "স্থায়ী ঠিকানা সংরক্ষিত হয়েছে।"
        : "বর্তমান ঠিকানা সংরক্ষিত হয়েছে।"
    );

  } catch (error) {

    message("ঠিকানা সংরক্ষণ করা যায়নি।", true);

  }
}

// ===================================
// GET SAVED ADDRESS
// ===================================

function getSaved(type) {

  try {

    const data = localStorage.getItem(STORAGE[type]);

    if (!data) return null;

    const parsed = JSON.parse(data);

    if (
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng)
    ) return null;

    return parsed;

  } catch (error) {

    return null;

  }
}

// ===================================
// RESTORE ADDRESSES
// ===================================

function restoreAddresses() {

  const home = getSaved("home");
  const current = getSaved("current");

  $("homeAddress").textContent = home
    ? home.address +
      " | " + home.lat.toFixed(5) +
      ", " + home.lng.toFixed(5)
    : "কোনো স্থায়ী ঠিকানা সংরক্ষিত নেই।";

  $("currentAddress").textContent = current
    ? current.address +
      " | " + current.lat.toFixed(5) +
      ", " + current.lng.toFixed(5)
    : "কোনো বর্তমান ঠিকানা সংরক্ষিত নেই।";

  const madhhab = localStorage.getItem(STORAGE.madhhab);

  if (madhhab) {
    $("madhhab").value = madhhab;
  }
}

// ===================================
// SHOW SAVED LOCATION
// ===================================

function showSaved(type) {

  const data = getSaved(type);

  if (!data) {
    message("সংরক্ষিত ঠিকানা নেই।", true);
    return;
  }

  selectLocation(
    data.lat,
    data.lng,
    false,
    data.address
  );

  message("সংরক্ষিত ঠিকানা ম্যাপে দেখানো হচ্ছে।");

}

// ===================================
// DELETE ADDRESS
// ===================================

function deleteAddress(type) {

  if (!getSaved(type)) {
    message("মুছে ফেলার মতো ঠিকানা নেই।", true);
    return;
  }

  localStorage.removeItem(STORAGE[type]);

  restoreAddresses();

  message("ঠিকানা মুছে ফেলা হয়েছে।");
}

// ===================================
// SAVE MADHHAB
// ===================================

$("madhhab").addEventListener("change", () => {

  localStorage.setItem(
    STORAGE.madhhab,
    $("madhhab").value
  );

  message("মাযহাব সংরক্ষণ হয়েছে।");

});

// ===================================
// BUTTON EVENTS
// ===================================

$("searchBtn").addEventListener(
  "click",
  searchAddress
);

$("searchAddress").addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
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
  () => saveAddress($("saveAs").value)
);

$("selectHomeBtn").addEventListener(
  "click",
  () => showSaved("home")
);

$("selectCurrentBtn").addEventListener(
  "click",
  () => showSaved("current")
);

$("deleteHomeBtn").addEventListener(
  "click",
  () => deleteAddress("home")
);

$("deleteCurrentBtn").addEventListener(
  "click",
  () => deleteAddress("current")
);

// ===================================
// START
// ===================================

initMap();
