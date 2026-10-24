import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const status = $("status");
const card = $("card");

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
    $("cNotes").textContent = pet.healthNotes || "No notes added.";

    const phone = (pet.ownerPhone || "").trim();
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
  } catch (err) {
    console.error(err);
    showStatus("Something went wrong loading this profile: " + err.message);
  }
}

loadPet();
