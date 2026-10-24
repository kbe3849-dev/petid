// ---------- Firebase ----------
import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ---------- Grab elements ----------
const $ = (id) => document.getElementById(id);

const fields = {
  petName: $("petName"),
  breed: $("breed"),
  temperament: $("temperament"),
  ownerName: $("ownerName"),
  ownerPhone: $("ownerPhone"),
  vaccinated: $("vaccinated"),
  healthNotes: $("healthNotes"),
};

const card = {
  name: $("cName"),
  breed: $("cBreed"),
  temper: $("cTemper"),
  owner: $("cOwner"),
  phone: $("cPhone"),
  vax: $("cVax"),
  notes: $("cNotes"),
};

// ---------- Update the card text ----------
function setText(el, value, fallback) {
  el.textContent = value.trim() || fallback;
}

function updateCard() {
  setText(card.name, fields.petName.value, "Pet name");
  setText(card.breed, fields.breed.value, "Breed");
  setText(card.temper, fields.temperament.value, "Temperament");
  setText(card.owner, fields.ownerName.value, "Owner name");
  setText(card.phone, fields.ownerPhone.value, "Phone number");
  setText(card.notes, fields.healthNotes.value, "No notes added.");

  const vaccinated = fields.vaccinated.checked;
  card.vax.textContent = vaccinated
    ? "Vaccinations up to date"
    : "Vaccination status not set";
  card.vax.className = "vax " + (vaccinated ? "yes" : "no");
}

// Update whenever anything in the form changes
Object.values(fields).forEach((el) => {
  el.addEventListener("input", updateCard);
  el.addEventListener("change", updateCard);
});

// ---------- Photo cropping (like social media apps) ----------
// The cropped pictures are kept here. Step 3 will upload these.
const photoBlobs = { pet: null, owner: null };
const originalFiles = { pet: null, owner: null };

const modal = $("cropModal");
const cropImage = $("cropImage");
let cropper = null;
let cropTarget = null; // "pet" or "owner"

function openCropper(file, target) {
  cropTarget = target;
  originalFiles[target] = file;
  modal.hidden = false;

  if (cropper) cropper.destroy();
  cropImage.src = URL.createObjectURL(file);

  cropper = new Cropper(cropImage, {
    aspectRatio: 1,          // square crop; the owner photo is shown as a circle by CSS
    viewMode: 1,
    dragMode: "move",        // drag the picture, not the box
    autoCropArea: 1,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    background: false,
  });
}

function closeCropper() {
  modal.hidden = true;
  if (cropper) cropper.destroy();
  cropper = null;
}

function setupPhoto(inputId, boxId, target) {
  const input = $(inputId);
  const box = $(boxId);

  input.addEventListener("change", () => {
    if (input.files[0]) openCropper(input.files[0], target);
  });

  // Click the photo on the card to adjust it again
  box.addEventListener("click", () => {
    if (originalFiles[target]) openCropper(originalFiles[target], target);
  });
}

setupPhoto("petPhoto", "petPhotoBox", "pet");
setupPhoto("ownerPhoto", "ownerPhotoBox", "owner");

$("zoomIn").addEventListener("click", () => cropper && cropper.zoom(0.1));
$("zoomOut").addEventListener("click", () => cropper && cropper.zoom(-0.1));
$("cropCancel").addEventListener("click", closeCropper);

$("cropApply").addEventListener("click", () => {
  if (!cropper) return;
  const size = cropTarget === "pet" ? 400 : 200; // small enough to store inside the database

  cropper.getCroppedCanvas({ width: size, height: size }).toBlob((blob) => {
    photoBlobs[cropTarget] = blob;

    const box = $(cropTarget === "pet" ? "petPhotoBox" : "ownerPhotoBox");
    box.style.backgroundImage = `url(${URL.createObjectURL(blob)})`;
    box.classList.add("has-image");

    closeCropper();
  }, "image/jpeg", 0.75);
});

// ---------- Save the profile to Firestore ----------
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const saveMessage = $("saveMessage");

function showMessage(text, type) {
  saveMessage.textContent = text;
  saveMessage.className = "save-message " + type;
  saveMessage.hidden = false;
}

// ---------- QR code ----------
let lastPetName = "pet";

function showQr(id, petName) {
  lastPetName = petName || "pet";

  // The link inside the QR. It is built from the current address, so it keeps
  // working after you host the site (even in a sub-folder).
  const url = new URL("pet.html?id=" + id, window.location.href).href;

  const qrBox = $("qrCode");
  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: url,
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.M,
  });

  const link = $("profileLink");
  link.href = url;
  link.textContent = url;

  $("qrResult").hidden = false;
  $("qrResult").scrollIntoView({ behavior: "smooth", block: "center" });
}

// Download the QR as a PNG with a white border (scanners need the empty margin)
$("downloadQr").addEventListener("click", () => {
  const qrCanvas = $("qrCode").querySelector("canvas");
  if (!qrCanvas) return;

  const pad = 32;
  const out = document.createElement("canvas");
  out.width = qrCanvas.width + pad * 2;
  out.height = qrCanvas.height + pad * 2;

  const ctx = out.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(qrCanvas, pad, pad);

  const safeName = lastPetName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pet";
  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = safeName + "-qr.png";
  a.click();
});

$("petForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.target.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Saving...";
  saveMessage.hidden = true;
  $("qrResult").hidden = true;

  try {
    const profile = {
      petName: fields.petName.value.trim(),
      breed: fields.breed.value.trim(),
      temperament: fields.temperament.value,
      ownerName: fields.ownerName.value.trim(),
      ownerPhone: fields.ownerPhone.value.trim(),
      vaccinated: fields.vaccinated.checked,
      healthNotes: fields.healthNotes.value.trim(),
      // photos are saved as text (data URLs) inside the same document
      petPhoto: photoBlobs.pet ? await blobToDataUrl(photoBlobs.pet) : "",
      ownerPhoto: photoBlobs.owner ? await blobToDataUrl(photoBlobs.owner) : "",
      createdAt: Date.now(),
    };

    const ref = await addDoc(collection(db, "pets"), profile);

    console.log("Saved! Pet ID:", ref.id);
    showMessage("Saved! Your pet's ID is " + ref.id, "ok");
    showQr(ref.id, profile.petName);
  } catch (err) {
    console.error(err);
    showMessage("Could not save: " + err.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save profile";
  }
});

updateCard();