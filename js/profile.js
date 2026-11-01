import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function getProfile(uid) {
  const profileRef = doc(db, "users", uid);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    throw new Error("User profile not found.");
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getMyProfile() {
  if (!auth.currentUser) {
    throw new Error("Please login first.");
  }

  return getProfile(auth.currentUser.uid);
}

export async function updateMyProfile(name, bio, photoURL = "") {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");

  const cleanName = name.trim();
  if (!cleanName) throw new Error("Name cannot be empty.");

  await updateDoc(doc(db, "users", user.uid), {
    name: cleanName,
    bio: bio.trim(),
    photoURL: photoURL.trim()
  });
}
