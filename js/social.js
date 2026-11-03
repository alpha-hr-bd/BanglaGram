import { auth, db } from "./firebase.js";
import {
  collection, query, orderBy, startAt, endAt, limit, getDocs,
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createNotification } from "./notifications.js";

export async function searchUsers(searchText) {
  const term = searchText.trim();
  if (!term) return [];
  const q = query(
    collection(db, "users"),
    orderBy("name"),
    startAt(term),
    endAt(term + "\uf8ff"),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function followUser(targetUid) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first.");
  if (!targetUid || user.uid === targetUid) throw new Error("You cannot follow yourself.");

  const targetRef = doc(db, "users", targetUid);
  const target = await getDoc(targetRef);
  if (!target.exists()) throw new Error("User not found.");

  const followId = `${user.uid}_${targetUid}`;
  const followRef = doc(db, "follows", followId);
  const existing = await getDoc(followRef);
  if (existing.exists()) return;

  await setDoc(followRef, {
    followerUid: user.uid,
    followingUid: targetUid,
    createdAt: serverTimestamp()
  });

  try {
    await createNotification(
      targetUid,
      "follow",
      `${user.displayName || "A BanglaGram member"} started following you.`
    );
  } catch (error) {
    // The follow is saved even if notification creation is unavailable.
    console.warn("Follow notification could not be created:", error);
  }
}

export async function unfollowUser(targetUid) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first.");
  if (user.uid === targetUid) throw new Error("Invalid account.");

  const followId = `${user.uid}_${targetUid}`;
  await deleteDoc(doc(db, "follows", followId));
}

export async function isFollowing(targetUid) {
  const user = auth.currentUser;
  if (!user) return false;
  const followId = `${user.uid}_${targetUid}`;
  const result = await getDoc(doc(db, "follows", followId));
  return result.exists();
}

export async function getFollowers(uid) {
  const q = query(
    collection(db, "follows"),
    where("followingUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getFollowing(uid) {
  const q = query(
    collection(db, "follows"),
    where("followerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

