// Firestore Admin CRUD helpers (client-side)
// NOTE: Security rules must protect writes.

import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from './firebase-init.js';

const PRODUCTS_COL = 'products';
const OFFERS_COL = 'offers';
const REVIEWS_COL = 'reviews';
const SETTINGS_COL = 'settings';

export async function adminListProducts() {
  const snap = await getDocs(collection(db, PRODUCTS_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminListOffers() {
  const snap = await getDocs(collection(db, OFFERS_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminListReviews() {
  const snap = await getDocs(collection(db, REVIEWS_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminCreateProduct(payload) {
  // Keep id in body if you want, but document id is authoritative.
  const docRef = await addDoc(collection(db, PRODUCTS_COL), payload);
  return docRef.id;
}

export async function adminUpdateProduct(id, payload) {
  await updateDoc(doc(db, PRODUCTS_COL, id), payload);
}

export async function adminDeleteProduct(id) {
  await deleteDoc(doc(db, PRODUCTS_COL, id));
}

export async function adminCreateOffer(payload) {
  const docRef = await addDoc(collection(db, OFFERS_COL), payload);
  return docRef.id;
}

export async function adminUpdateOffer(id, payload) {
  await updateDoc(doc(db, OFFERS_COL, id), payload);
}

export async function adminDeleteOffer(id) {
  await deleteDoc(doc(db, OFFERS_COL, id));
}

export async function adminUpdateReview(id, payload) {
  await updateDoc(doc(db, REVIEWS_COL, id), payload);
}

export async function adminDeleteReview(id) {
  await deleteDoc(doc(db, REVIEWS_COL, id));
}

export async function adminGetSettings() {
  const snap = await getDocs(collection(db, SETTINGS_COL));
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
}

export async function adminUpsertSettings(payload) {
  const snap = await getDocs(collection(db, SETTINGS_COL));
  if (snap.empty) {
    await addDoc(collection(db, SETTINGS_COL), payload);
    return;
  }
  const first = snap.docs[0];
  await updateDoc(doc(db, SETTINGS_COL, first.id), payload);
}

