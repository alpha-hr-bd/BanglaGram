import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function createNotification(
  receiverUid,
  type,
  message
) {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");
  if (receiverUid === user.uid) return;

  await addDoc(
    collection(db, "notifications"),
    {
      receiverUid,
      senderUid: user.uid,
      senderName: user.displayName || "BanglaGram User",
      type,
      message,
      read: false,
      createdAt: serverTimestamp()
    }
  );
}

export async function getNotifications() {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");

  const q = query(
    collection(db, "notifications"),
    where("receiverUid", "==", user.uid),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function markNotificationRead(notificationId) {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");

  await updateDoc(
    doc(db, "notifications", notificationId),
    { read: true }
  );
}
