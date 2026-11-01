import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function searchUsers(searchText) {
  const term = searchText.trim();

  if (!term) return [];

  const q = query(
    collection(db, "users"),
    orderBy("name"),
    startAt(term),
    endAt(term + "\uf8ff"),
    limit(15)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function followUser(targetUid) {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");
  if (user.uid === targetUid) {
    throw new Error("You cannot follow yourself.");
  }

  const target = await getDoc(doc(db, "users", targetUid));

  if (!target.exists()) {
    throw new Error("User not found.");
  }

  const followId = `${user.uid}_${targetUid}`;

  await setDoc(doc(db, "follows", followId), {
    followerUid: user.uid,
    followingUid: targetUid,
    createdAt: serverTimestamp()
  });
}

export async function unfollowUser(targetUid) {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");

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
    orderBy("createdAt", "desc"),
    limit(100)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => item.data())
    .filter((item) => item.followingUid === uid);
}

export async function getFollowing(uid) {
  const q = query(
    collection(db, "follows"),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => item.data())
    .filter((item) => item.followerUid === uid);
}
