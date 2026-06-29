// Firebase client helpers (Firestore + Auth)

import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { firebaseApp } from "./firebase-config.js";

export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
