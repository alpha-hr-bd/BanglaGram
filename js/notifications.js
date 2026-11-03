import { auth, db } from "./firebase.js";
import {
  collection, addDoc, query, where, orderBy, limit, getDocs,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function createNotification(receiverUid, type, message, extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  if (!receiverUid || receiverUid === user.uid) return;
  await addDoc(collection(db, "notifications"), {
    receiverUid, senderUid: user.uid,
    senderName: user.displayName || "BanglaGram member",
    type, message, read: false, createdAt: serverTimestamp(),
    ...extra
  });
}
export async function getNotifications() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  const q = query(collection(db, "notifications"), where("receiverUid", "==", user.uid), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function markNotificationRead(id) {
  if (!auth.currentUser) throw new Error("Please log in first.");
  await updateDoc(doc(db, "notifications", id), { read: true });
}

