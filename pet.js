import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const status = $("status");
const card = $("card");

// Filled in once the pet loads. Used by the "share location" feature.
let ownerPhone = "";
let petNameForMsg = "this pet";

function showStatus(text) {
  status.textContent = text;
  status.hidden = false;
}

// Only accept real image data URLs for the photos
function setPhoto(boxId, dataUrl) {
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
    const box = $(boxId);
    box.style.backgroundImage = `url(${dataUrl})`;
    box.classList.add("has-image");
  }
}

async function loadPet() {
  // 1. Read the ID from the address: pet.html?id=XXXX
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id || !/^[A-Za-z0-9]+$/.test(id)) {
    showStatus("No pet ID in this link. Scan the tag's QR code again.");
    return;
  }

  try {
    // 2. Fetch that pet from Firestore
    const snap = await getDoc(doc(db, "pets", id));

    if (!snap.exists()) {
      showStatus("We couldn't find this pet profile.");
      return;
    }

    const pet = snap.data();

    // 3. Fill in the card. textContent keeps typed text from running as code.
    $("cName").textContent = pet.petName || "Unnamed pet";
    $("cBreed").textContent = pet.breed || "";
    $("cTemper").textContent = pet.temperament || "";
    $("cTemper").hidden = !pet.temperament;
    $("cOwner").textContent = pet.ownerName || "Owner not listed";

    // Older profiles have no address, so hide the line when it is empty
    const address = (pet.ownerAddress || "").trim();
    $("cAddress").textContent = address;
    $("cAddress").hidden = !address;
    $("cNotes").textContent = pet.healthNotes || "No notes added.";

    const phone = (pet.ownerPhone || "").trim();
    ownerPhone = phone;
    petNameForMsg = pet.petName || "your pet";
    const call = $("cPhone");
    if (phone) {
      call.textContent = "Call " + phone;
      call.href = "tel:" + phone.replace(/[^\d+]/g, "");
    } else {
      call.hidden = true;
    }

    const vax = $("cVax");
    vax.textContent = pet.vaccinated ? "Vaccinations up to date" : "Vaccination status not set";
    vax.className = "vax " + (pet.vaccinated ? "yes" : "no");

    setPhoto("petPhotoBox", pet.petPhoto);
    setPhoto("ownerPhotoBox", pet.ownerPhoto);

    document.title = (pet.petName || "Pet") + " – PetID";
    status.hidden = true;
    card.hidden = false;
    setupLocationShare();
  } catch (err) {
    console.error(err);
    showStatus("Something went wrong loading this profile: " + err.message);
  }
}

// ---------- Finder shares their location (only when they choose to) ----------
// Turn the owner's number into digits for WhatsApp/SMS links.
// 10-digit numbers are treated as Indian (+91). Change this if you need other countries.
function phoneDigits(raw) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

function setupLocationShare() {
  const box = $("locateBox");
  const btn = $("shareLocation");
  const msg = $("locMsg");
  const actions = $("locActions");

  box.hidden = false;

  // No owner phone saved, or phone has no usable digits: nothing to send to
  const digits = phoneDigits(ownerPhone);
  if (!digits) {
    btn.hidden = true;
    msg.textContent = "The owner did not list a phone number, so location sharing is not available.";
    msg.className = "save-message error";
    msg.hidden = false;
    return;
  }

  function note(text, type) {
    msg.textContent = text;
    msg.className = "save-message " + type;
    msg.hidden = false;
  }

  btn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      note("This browser can't share location. You can still call the owner using the button above.", "error");
      return;
    }

    actions.hidden = true;
    btn.disabled = true;
    btn.textContent = "Getting location...";
    note("Your phone will ask permission. Tap Allow to continue.", "ok");

    // This call is what triggers the browser's own permission pop-up.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy);
        const mapUrl = "https://www.google.com/maps?q=" + lat + "," + lng;

        const text =
          "Hi, I found " + petNameForMsg + " (PetID). " +
          "Here is my current location: " + mapUrl +
          " (accurate to about " + acc + " m).";

        $("sendWhatsApp").href = "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
        $("sendSms").href = "sms:+" + digits + "?body=" + encodeURIComponent(text);
        $("viewMap").href = mapUrl;

        $("copyLoc").onclick = async () => {
          try {
            await navigator.clipboard.writeText(text);
            note("Message copied. Paste it into any app.", "ok");
          } catch {
            note("Couldn't copy. Use WhatsApp or SMS instead.", "error");
          }
        };

        note("Got it. Choose how to send it. Nothing has been sent yet.", "ok");
        actions.hidden = false;
        btn.disabled = false;
        btn.textContent = "Update my location";
      },
      (err) => {
        const reasons = {
          1: "Location permission was denied, so nothing was shared. You can still call the owner.",
          2: "Your location could not be found. Try again outdoors or turn on GPS.",
          3: "Finding your location took too long. Please try again.",
        };
        note(reasons[err.code] || "Could not get your location.", "error");
        btn.disabled = false;
        btn.textContent = "Share my location with the owner";
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

loadPet();