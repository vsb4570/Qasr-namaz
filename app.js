
const $ = (id) => document.getElementById(id);

const status = $("status");
const selectedAddress = $("selectedAddress");
const coords = $("coords");
const saveBtn = $("saveBtn");

let selected = null;
let marker = null;
let map = null;

const STORAGE_KEY = "qasr-salah-addresses";

function setStatus(message) {
  status.textContent = message;
}

function updateMarker(lat, lng) {
  if (!map) return;

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng]).addTo(map);
  }

  map.setView([lat, lng], 15);
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Address lookup failed");

    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch (error) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function selectLocation(lat, lng, address = null) {
  selected = { lat, lng };

  updateMarker(lat, lng);

  selectedAddress.textContent = address || "ঠিকানা খোঁজা হচ্ছে...";
  coords.textContent =
    `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;

  saveBtn.disabled = false;

  if (!address) {
    const name = await reverseGeocode(lat, lng);
    selected.address = name;
    selectedAddress.textContent = name;
  } else {
    selected.address = address;
  }
}

// Initialize OpenStreetMap
if (typeof L !== "undefined") {
  map = L.map("map").setView([23.8103, 90.4125], 12);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }
  ).addTo(map);

  map.on("click", async (event) => {
    setStatus("নির্বাচিত স্থানের ঠিকানা খোঁজা হচ্ছে...");
    await selectLocation(
      event.latlng.lat,
      event.latlng.lng
    );
    setStatus("ঠিকানা নির্বাচন সম্পন্ন হয়েছে।");
  });
} else {
  setStatus("মানচিত্র লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
}

// GPS button
$("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("আপনার ব্রাউজারে GPS সুবিধা নেই।");
    return;
  }

  setStatus("GPS লোকেশন খোঁজা হচ্ছে...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      await selectLocation(lat, lng);

      setStatus("আপনার বর্তমান GPS লোকেশন পাওয়া গেছে।");
    },
    (error) => {
      const messages = {
        1: "লোকেশন অনুমতি দেওয়া হয়নি। ব্রাউজারে Location Allow করুন।",
        2: "বর্তমানে GPS লোকেশন পাওয়া যাচ্ছে না।",
        3: "GPS খুঁজতে সময় শেষ হয়েছে। আবার চেষ্টা করুন।"
      };

      setStatus(messages[error.code] || "GPS-এ সমস্যা হয়েছে।");
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
});

// Search address
$("searchBtn").addEventListener("click", async () => {
  const query = $("search").value.trim();

  if (!query) {
    setStatus("আগে একটি ঠিকানা লিখুন।");
    return;
  }

  setStatus("ঠিকানা খোঁজা হচ্ছে...");

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Search failed");

    const results = await response.json();

    if (!results.length) {
      setStatus("কোনো ঠিকানা পাওয়া যায়নি।");
      return;
    }

    const place = results[0];

    await selectLocation(
      Number(place.lat),
      Number(place.lon),
      place.display_name
    );

    setStatus("ঠিকানা পাওয়া গেছে।");
  } catch (error) {
    setStatus("ঠিকানা খুঁজতে সমস্যা হয়েছে।");
  }
});

// Save selected address
function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderSaved() {
  const list = $("savedList");
  list.replaceChildren();

  getSaved().forEach((item) => {
    const button = document.createElement("button");
    button.className = "secondary";
    button.textContent = `${item.type}: ${item.address}`;

    button.addEventListener("click", () => {
      selected = item;
      selectedAddress.textContent = item.address;
      coords.textContent =
        `Latitude: ${item.lat}, Longitude: ${item.lng}`;

      saveBtn.disabled = false;
      updateMarker(item.lat, item.lng);
    });

    list.appendChild(button);
  });
}

saveBtn.addEventListener("click", () => {
  if (!selected) return;

  const item = {
    ...selected,
    type: $("placeType").selectedOptions[0].textContent,
    address: selected.address ||
      `${selected.lat}, ${selected.lng}`
  };

  const saved = getSaved();
  saved.push(item);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

  renderSaved();
  setStatus("ঠিকানা সফলভাবে সংরক্ষণ হয়েছে।");
  saveBtn.disabled = true;
});

// Clear saved data
$("clearBtn").addEventListener("click", () => {
  if (!confirm("সব সংরক্ষিত ঠিকানা মুছে ফেলবেন?")) return;

  localStorage.removeItem(STORAGE_KEY);

  selected = null;
  selectedAddress.textContent =
    "এখনো কোনো ঠিকানা নির্বাচন করা হয়নি।";
  coords.textContent = "";
  saveBtn.disabled = true;

  if (marker && map) {
    map.removeLayer(marker);
    marker = null;
  }

  renderSaved();
  setStatus("সংরক্ষিত তথ্য মুছে ফেলা হয়েছে।");
});

// Madhhab preference
const madhhab = $("madhhab");

madhhab.value =
  localStorage.getItem("qasr-madhhab") || "হানাফি";

madhhab.addEventListener("change", () => {
  localStorage.setItem("qasr-madhhab", madhhab.value);
  $("madhhabStatus").textContent =
    "আপনার পছন্দ সংরক্ষণ হয়েছে: " + madhhab.value;
});

$("madhhabStatus").textContent =
  "নির্বাচিত মাজহাব: " + madhhab.value;

renderSaved();
