import { auth, db } from "./firebase.js";
import {
  collection, query, orderBy, startAt, endAt, limit, getDocs,
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createNotification } from "./notifications.js";

export async function getAllUsers() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function searchUsers(term) {
  const value = term.trim();
  if (!value) return getAllUsers();
  const q = query(collection(db, "users"), orderBy("name"), startAt(value), endAt(value + "\uf8ff"), limit(40));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function followUser(targetUid) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  if (!targetUid || targetUid === user.uid) throw new Error("You cannot follow yourself.");
  const target = await getDoc(doc(db, "users", targetUid));
  if (!target.exists()) throw new Error("Member not found.");
  const ref = doc(db, "follows", `${user.uid}_${targetUid}`);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, { followerUid: user.uid, followingUid: targetUid, createdAt: serverTimestamp() });
  try {
    await createNotification(targetUid, "follow", `${user.displayName || "A member"} started following you.`, { targetUid: user.uid });
  } catch (e) { console.warn("Follow notification:", e); }
}
export async function unfollowUser(targetUid) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  await deleteDoc(doc(db, "follows", `${user.uid}_${targetUid}`));
}
export async function isFollowing(targetUid) {
  if (!auth.currentUser) return false;
  return (await getDoc(doc(db, "follows", `${auth.currentUser.uid}_${targetUid}`))).exists();
}
export async function getFollowers(uid) {
  const q = query(collection(db, "follows"), where("followingUid", "==", uid), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getFollowing(uid) {
  const q = query(collection(db, "follows"), where("followerUid", "==", uid), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

