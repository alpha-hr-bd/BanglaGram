import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBoHOzek_SvrL_OA7BNyPGNL3NBEZz1ppM",
  authDomain: "bangla-gram123.firebaseapp.com",
  databaseURL: "https://bangla-gram123-default-rtdb.firebaseio.com",
  projectId: "bangla-gram123",
  storageBucket: "bangla-gram123.firebasestorage.app",
  messagingSenderId: "506223922726",
  appId: "1:506223922726:web:0cae6cc35330e3b68ba0e7",
  measurementId: "G-3SP9PSJZ82"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(console.error);
