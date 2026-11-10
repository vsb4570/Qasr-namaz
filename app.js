
"use strict";

// ======================================
// GOOGLE MAPS API KEY
// ======================================

const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

// ======================================
// ELEMENTS
// ======================================

const $ = (id) => document.getElementById(id);

const status = $("status");
const selectedAddress = $("selectedAddress");
const coords = $("coords");

let map = null;
let marker = null;
let geocoder = null;
let selected = null;

// ======================================
// STORAGE KEYS
// ======================================

const STORAGE = {
  home: "qasr_home_address",
  current: "qasr_current_address",
  madhhab: "qasr_madhhab"
};

// ======================================
// STATUS
// ======================================

function showStatus(message, error = false) {
  status.textContent = message;
  status.style.color = error ? "#c0392b" : "#087b50";
}

// ======================================
// GOOGLE MAPS LOADING
// ======================================

function loadGoogleMaps() {

  if (
    !GOOGLE_MAPS_API_KEY ||
    GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY"
  ) {
    showStatus(
      "Google Maps চালু করতে app.js-এ আপনার API Key বসান।",
      true
    );
    return;
  }

  if (window.google && window.google.maps) {
    initMap();
    return;
  }

  window.initMap = initMap;

  const script = document.createElement("script");

  script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    encodeURIComponent(GOOGLE_MAPS_API_KEY) +
    "&callback=initMap&v=weekly";

  script.async = true;
  script.defer = true;

  script.onerror = () => {
    showStatus(
      "Google Maps লোড হয়নি। API Key ও API সেটিং পরীক্ষা করুন।",
      true
    );
  };

  document.head.appendChild(script);
}

// ======================================
// INITIALIZE MAP
// ======================================

function initMap() {

  const defaultLocation = {
    lat: 23.8103,
    lng: 90.4125
  };

  map = new google.maps.Map($("map"), {
    center: defaultLocation,
    zoom: 12,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true
  });

  geocoder = new google.maps.Geocoder();

  marker = new google.maps.Marker({
    position: defaultLocation,
    map: map,
    draggable: true,
    title: "ঠিকানা নির্বাচন করুন"
  });

  // ম্যাপে ক্লিক করে ঠিকানা নির্বাচন

  map.addListener("click", (event) => {

    const position = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    selectLocation(position);
  });

  // পিন সরালে ঠিকানা আপডেট

  marker.addListener("dragend", () => {

    const position = marker.getPosition();

    selectLocation({
      lat: position.lat(),
      lng: position.lng()
    });

  });

  showStatus("Google Maps সফলভাবে চালু হয়েছে।");

  restoreSavedAddresses();

  const saved = getAddress("home") || getAddress("current");

  if (saved) {
    selectLocation(saved, false);
  }
}

// ======================================
// SELECT LOCATION
// ======================================

function selectLocation(position, reverse = true) {

  selected = {
    lat: Number(position.lat),
    lng: Number(position.lng),
    address: "ঠিকানা খোঁজা হচ্ছে..."
  };

  marker.setPosition(position);
  map.setCenter(position);
  map.setZoom(16);

  selectedAddress.textContent = selected.address;

  coords.textContent =
    "Latitude: " + selected.lat.toFixed(6) +
    " | Longitude: " + selected.lng.toFixed(6);

  if (reverse) {
    reverseGeocode(position);
  } else {
    selected.address = position.address || "সংরক্ষিত ঠিকানা";
    selectedAddress.textContent = selected.address;
  }
}

// ======================================
// REVERSE GEOCODING
// ======================================

function reverseGeocode(position) {

  geocoder.geocode(
    { location: position },
    (results, resultStatus) => {

      if (resultStatus === "OK" && results.length > 0) {

        const address = results[0].formatted_address;

        if (selected) {
          selected.address = address;
          selectedAddress.textContent = address;
        }

        showStatus("ঠিকানা শনাক্ত হয়েছে।");

      } else {

        if (selected) {
          selected.address =
            position.lat + ", " + position.lng;

          selectedAddress.textContent = selected.address;
        }

        showStatus(
          "ঠিকানা পাওয়া যায়নি। স্থানাঙ্ক ব্যবহার করতে পারবেন।",
          true
        );
      }
    }
  );
}

// ======================================
// SEARCH ADDRESS
// ======================================

function searchAddress() {

  const query = $("searchAddress").value.trim();

  if (!query) {
    showStatus("অনুগ্রহ করে ঠিকানা লিখুন।", true);
    return;
  }

  if (!geocoder) {
    showStatus("Google Maps এখনো চালু হয়নি।", true);
    return;
  }

  showStatus("ঠিকানা খোঁজা হচ্ছে...");

  geocoder.geocode(
    { address: query },
    (results, resultStatus) => {

      if (
        resultStatus === "OK" &&
        results.length > 0
      ) {

        const location = results[0].geometry.location;

        selectLocation({
          lat: location.lat(),
          lng: location.lng()
        });

        showStatus("ঠিকানা পাওয়া গেছে।");

      } else {

        showStatus(
          "ঠিকানা পাওয়া যায়নি। আবার চেষ্টা করুন।",
          true
        );
      }
    }
  );
}

// ======================================
// CURRENT GPS LOCATION
// ======================================

function getCurrentLocation() {

  if (!navigator.geolocation) {
    showStatus("আপনার ব্রাউজারে GPS সমর্থিত নয়।", true);
    return;
  }

  showStatus("আপনার বর্তমান লোকেশন খোঁজা হচ্ছে...");

  navigator.geolocation.getCurrentPosition(

    (position) => {

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      selectLocation(location);

      // GPS থেকে পাওয়া অবস্থান বর্তমান ঠিকানা হিসেবে সংরক্ষণ

      setTimeout(() => {

        if (
          selected &&
          selected.lat === location.lat &&
          selected.lng === location.lng
        ) {
          saveAddress("current");
        }

      }, 1200);

    },

    (error) => {

      let message = "লোকেশন পাওয়া যায়নি।";

      if (error.code === 1) {
        message = "লোকেশন ব্যবহারের অনুমতি দিন।";
      } else if (error.code === 2) {
        message = "GPS অবস্থান পাওয়া যাচ্ছে না।";
      } else if (error.code === 3) {
        message = "লোকেশন খুঁজতে সময় শেষ হয়েছে।";
      }

      showStatus(message, true);

    },

    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}

// ======================================
// SAVE ADDRESS
// ======================================

function saveAddress(type) {

  if (!selected) {
    showStatus("প্রথমে ম্যাপে একটি ঠিকানা নির্বাচন করুন।", true);
    return;
  }

  const address = {
    lat: selected.lat,
    lng: selected.lng,
    address: selected.address || "ঠিকানা নির্ধারিত হয়নি"
  };

  try {

    localStorage.setItem(
      STORAGE[type],
      JSON.stringify(address)
    );

    renderSavedAddresses();

    showStatus(
      type === "home"
        ? "স্থায়ী ঠিকানা সফলভাবে সংরক্ষিত হয়েছে।"
        : "বর্তমান ঠিকানা সফলভাবে সংরক্ষিত হয়েছে।"
    );

  } catch (error) {

    showStatus("ঠিকানা সংরক্ষণ করা যায়নি।", true);

  }
}

// ======================================
// GET SAVED ADDRESS
// ======================================

function getAddress(type) {

  try {

    const data = localStorage.getItem(STORAGE[type]);

    return data ? JSON.parse(data) : null;

  } catch (error) {

    return null;

  }
}

// ======================================
// RESTORE SAVED ADDRESSES
// ======================================

function restoreSavedAddresses() {

  renderSavedAddresses();

  const madhhab = localStorage.getItem(STORAGE.madhhab);

  if (madhhab) {
    $("madhhab").value = madhhab;
  }
}

// ======================================
// DISPLAY SAVED ADDRESSES
// ======================================

function renderSavedAddresses() {

  const home = getAddress("home");
  const current = getAddress("current");

  $("homeAddress").textContent = home
    ? home.address +
      " | " + home.lat.toFixed(6) +
      ", " + home.lng.toFixed(6)
    : "কোনো স্থায়ী ঠিকানা সংরক্ষিত নেই";

  $("currentAddress").textContent = current
    ? current.address +
      " | " + current.lat.toFixed(6) +
      ", " + current.lng.toFixed(6)
    : "কোনো বর্তমান ঠিকানা সংরক্ষিত নেই";
}

// ======================================
// SHOW SAVED LOCATION ON MAP
// ======================================

function showSavedLocation(type) {

  const address = getAddress(type);

  if (!address) {
    showStatus("এই ঠিকানা এখনো সংরক্ষণ করা হয়নি।", true);
    return;
  }

  selectLocation(address, false);

  showStatus(
    type === "home"
      ? "স্থায়ী ঠিকানা ম্যাপে দেখানো হচ্ছে।"
      : "বর্তমান ঠিকানা ম্যাপে দেখানো হচ্ছে।"
  );
}

// ======================================
// MADHHAB STORAGE
// ======================================

function saveMadhhab() {

  localStorage.setItem(
    STORAGE.madhhab,
    $("madhhab").value
  );

  showStatus("মাযহাব সংরক্ষণ করা হয়েছে।");
}

// ======================================
// BUTTON EVENTS
// ======================================

$("searchBtn").addEventListener(
  "click",
  searchAddress
);

$("searchAddress").addEventListener(
  "keydown",
  (event) => {
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
  () => {
    saveAddress($("saveAs").value);
  }
);

$("selectHomeBtn").addEventListener(
  "click",
  () => showSavedLocation("home")
);

$("selectCurrentBtn").addEventListener(
  "click",
  () => showSavedLocation("current")
);

$("madhhab").addEventListener(
  "change",
  saveMadhhab
);

// ======================================
// START APPLICATION
// ======================================

loadGoogleMaps();

