import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const signupBtn = $("signupBtn");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const resetBtn = $("resetBtn");

export function initAuth(onLogin, onLogout) {
  signupBtn?.addEventListener("click", async () => {
    const name = $("name").value.trim();
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!name || !email || password.length < 6) {
      return showMessage("Enter your name, email and a password of at least 6 characters.");
    }

    try {
      signupBtn.disabled = true;

      const result = await createUserWithEmailAndPassword(
        auth, email, password
      );

      await updateProfile(result.user, { displayName: name });

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name,
        email,
        bio: "",
        photoURL: "",
        followers: 0,
        following: 0,
        createdAt: serverTimestamp()
      });

      showMessage("Account created successfully!");
    } catch (error) {
      showMessage(error.message);
    } finally {
      signupBtn.disabled = false;
    }
  });

  loginBtn?.addEventListener("click", async () => {
    const email = $("email").value.trim();
    const password = $("password").value;

    try {
      loginBtn.disabled = true;
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("Login successful!");
    } catch (error) {
      showMessage(error.message);
    } finally {
      loginBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });

  resetBtn?.addEventListener("click", async () => {
    const email = $("email").value.trim();

    if (!email) {
      return showMessage("Enter your email address first.");
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset email sent!");
    } catch (error) {
      showMessage(error.message);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      $("authSection").hidden = true;
      $("appSection").hidden = false;
      logoutBtn.hidden = false;

      if (onLogin) onLogin(user);
    } else {
      $("authSection").hidden = false;
      $("appSection").hidden = true;
      logoutBtn.hidden = true;

      if (onLogout) onLogout();
    }
  });
}

function showMessage(message) {
  $("authMessage").textContent = message;
}
