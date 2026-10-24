// firebase.js: connects your site to Firebase.
// This uses the CDN version of the SDK, so it works in plain HTML/JS without npm.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdP6eLHechWxgvxmcPnfov_wey2WPS2Lw",
  authDomain: "petid-d5069.firebaseapp.com",
  projectId: "petid-d5069",
  storageBucket: "petid-d5069.firebasestorage.app",
  messagingSenderId: "183226109496",
  appId: "1:183226109496:web:ceff25e05dbd35f8f8e0cd",
};

const app = initializeApp(firebaseConfig);

// "db" is what the rest of the site uses to read and write pet profiles
export const db = getFirestore(app);
