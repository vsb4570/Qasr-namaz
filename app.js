
const $ = (id) => document.getElementById(id);

const status = $("status");
const selectedAddress = $("selectedAddress");
const coords = $("coords");
const saveBtn = $("saveBtn");

let selected = null;
let marker = null;
let map = null;

let selectionCounter = 0;

const STORAGE_KEY = "qasr-salah-addresses";
const CURRENT_LOCATION_KEY = "qasr-current-location";
const MADHHAB_KEY = "qasr-madhhab";

// Status message
function setStatus(message) {
  if (status) status.textContent = message;
}

// Current location storage
function setCurrentLocation(location) {
  localStorage.setItem(
    CURRENT_LOCATION_KEY,
    JSON.stringify(location)
  );
}

function getCurrentLocation() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT_LOCATION_KEY)
    );
  } catch {
    return null;
  }
}

// Update map marker
function updateMarker(lat, lng) {
  if (!map) return;

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng]).addTo(map);
  }

  map.setView([lat, lng], 15);
}

// Reverse geocoding
async function reverseGeocode(lat, lng) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=bn`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Address lookup failed");
    }

    const data = await response.json();

    return data.display_name ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  } catch (error) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Select current location
async function selectLocation(
  lat,
  lng,
  address = null,
  source = "manual"
) {
  const requestId = ++selectionCounter;

  selected = {
    lat: Number(lat),
    lng: Number(lng),
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

  if (saveBtn) saveBtn.disabled = false;

  if (!address) {
    const name = await reverseGeocode(lat, lng);

    // Prevent an older lookup from replacing a newer selection
    if (requestId !== selectionCounter) return;

    selected.address = name;

    if (selectedAddress) {
      selectedAddress.textContent = name;
    }
  }

  setCurrentLocation(selected);

  return selected;
}

// Initialize OpenStreetMap
if (typeof L !== "undefined" && $("map")) {
  map = L.map("map").setView(
    [23.8103, 90.4125],
    12
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(map);

  // Manual map selection
  map.on("click", async (event) => {
    setStatus("নির্বাচিত স্থানের ঠিকানা খোঁজা হচ্ছে...");

    await selectLocation(
      event.latlng.lat,
      event.latlng.lng,
      null,
      "manual"
    );

    setStatus("ম্যানুয়াল লোকেশন নির্বাচন সম্পন্ন হয়েছে।");
  });

} else {
  setStatus(
    "মানচিত্র লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।"
  );
}

// GPS location
const locateBtn = $("locateBtn");

if (locateBtn) {
  locateBtn.addEventListener("click", () => {

    if (!navigator.geolocation) {
      setStatus("আপনার ব্রাউজারে GPS সুবিধা নেই।");
      return;
    }

    setStatus("GPS লোকেশন খোঁজা হচ্ছে...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await selectLocation(
          lat,
          lng,
          null,
          "gps"
        );

        setStatus("আপনার বর্তমান GPS লোকেশন পাওয়া গেছে।");
      },

      (error) => {
        const messages = {
          1: "লোকেশন অনুমতি দেওয়া হয়নি। Location Allow করুন।",
          2: "বর্তমানে GPS লোকেশন পাওয়া যাচ্ছে না।",
          3: "GPS খুঁজতে সময় শেষ হয়েছে। আবার চেষ্টা করুন।"
        };

        setStatus(
          messages[error.code] || "GPS-এ সমস্যা হয়েছে।"
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  });
}

// Search address
const searchBtn = $("searchBtn");

if (searchBtn) {
  searchBtn.addEventListener("click", async () => {

    const query = $("search").value.trim();

    if (!query) {
      setStatus("আগে একটি ঠিকানা লিখুন।");
      return;
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

      if (!results.length) {
        setStatus("কোনো ঠিকানা পাওয়া যায়নি।");
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
      setStatus("ঠিকানা খুঁজতে সমস্যা হয়েছে।");
    }
  });
}

// Saved addresses
function getSaved() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    return Array.isArray(saved) ? saved : [];

  } catch {
    return [];
  }
}

// Render saved addresses
function renderSaved() {
  const list = $("savedList");

  if (!list) return;

  list.replaceChildren();

  getSaved().forEach((item, index) => {

    const button = document.createElement("button");

    button.className = "secondary";

    button.textContent =
      `${item.type || "লোকেশন"}: ${item.address}`;

    button.addEventListener("click", async () => {

      await selectLocation(
        item.lat,
        item.lng,
        item.address,
        "saved"
      );

      setStatus(
        "সংরক্ষিত লোকেশন বর্তমান লোকেশন হিসেবে নির্বাচন হয়েছে।"
      );
    });

    list.appendChild(button);
  });
}

// Save selected address
if (saveBtn) {
  saveBtn.addEventListener("click", () => {

    if (!selected) return;

    const placeType = $("placeType");

    const item = {
      ...selected,
      type: placeType
        ? placeType.selectedOptions[0].textContent
        : "অন্যান্য",
      address: selected.address ||
        `${selected.lat}, ${selected.lng}`
    };

    const saved = getSaved();

    saved.push(item);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(saved)
    );

    // Keep this as current location too
    setCurrentLocation(item);

    selected = item;

    renderSaved();

    setStatus("ঠিকানা সফলভাবে সংরক্ষণ হয়েছে।");

    saveBtn.disabled = true;
  });
}

// Clear saved addresses
const clearBtn = $("clearBtn");

if (clearBtn) {
  clearBtn.addEventListener("click", () => {

    if (!confirm("সব সংরক্ষিত ঠিকানা মুছে ফেলবেন?")) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);

    selected = null;
    selectionCounter++;

    if (selectedAddress) {
      selectedAddress.textContent =
        "এখনো কোনো ঠিকানা নির্বাচন করা হয়নি।";
    }

    if (coords) coords.textContent = "";

    if (saveBtn) saveBtn.disabled = true;

    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
    }

    renderSaved();

    setStatus("সংরক্ষিত ঠিকানাগুলো মুছে ফেলা হয়েছে।");
  });
}

// Madhhab preference
const madhhab = $("madhhab");

if (madhhab) {

  madhhab.value =
    localStorage.getItem(MADHHAB_KEY) || "হানাফি";

  madhhab.addEventListener("change", () => {

    localStorage.setItem(
      MADHHAB_KEY,
      madhhab.value
    );

    const madhhabStatus = $("madhhabStatus");

    if (madhhabStatus) {
      madhhabStatus.textContent =
        "আপনার পছন্দ সংরক্ষণ হয়েছে: " +
        madhhab.value;
    }
  });

  const madhhabStatus = $("madhhabStatus");

  if (madhhabStatus) {
    madhhabStatus.textContent =
      "নির্বাচিত মাজহাব: " + madhhab.value;
  }
}

// Restore previous current location
function restoreCurrentLocation() {

  const previousLocation = getCurrentLocation();

  if (!previousLocation) return;

  if (
    typeof previousLocation.lat !== "number" ||
    typeof previousLocation.lng !== "number"
  ) {
    return;
  }

  selectLocation(
    previousLocation.lat,
    previousLocation.lng,
    previousLocation.address,
    previousLocation.source || "saved"
  );

  setStatus("আগের নির্বাচিত লোকেশন পুনরুদ্ধার হয়েছে।");
}

// Initialize saved data and location
renderSaved();
restoreCurrentLocation();
    
