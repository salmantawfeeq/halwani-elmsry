// Centralized Firebase configuration for the web app (SDK v9+)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZeiqcsIH1U36qMGWtZXI16QF_dPuWcaU",
  authDomain: "halwani-elmsry.firebaseapp.com",
  projectId: "halwani-elmsry",
  storageBucket: "halwani-elmsry.firebasestorage.app",
  messagingSenderId: "558331271626",
  appId: "1:558331271626:web:bc3dede1030c4673c1d733",
  measurementId: "G-RXE8E8R51N"
};

export const firebaseApp = initializeApp(firebaseConfig);

