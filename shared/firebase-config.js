// ======================================================
// RUMBLETRAIN BLOOD BOWL - FIREBASE CONFIGURATION
// GitHub shared/firebase-config.js
// ======================================================

// ------------------------------------------------------
// Firebase SDK Imports
// ------------------------------------------------------
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// ------------------------------------------------------
// Firebase Project Configuration
// ------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC20NYUavu-MqY8Eyo9a4oAWgEMq6NRW3k",
  authDomain: "rumbletrain-blood-bowl.firebaseapp.com",
  projectId: "rumbletrain-blood-bowl",
  storageBucket: "rumbletrain-blood-bowl.firebasestorage.app",
  messagingSenderId: "467215576702",
  appId: "1:467215576702:web:c16a5054f131f2e365b22f"
};

// ------------------------------------------------------
// Initialise Firebase and Cloud Firestore
// ------------------------------------------------------
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ------------------------------------------------------
// Export Shared Connections
// ------------------------------------------------------
export { app, db };
