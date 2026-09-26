// ==========================================
// 🇧🇩 BANGLAGRAM
// Firebase Social Platform
// Stable Version
// ==========================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// FIREBASE CONFIG
// ==========================================

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


// ==========================================
// INITIALIZE
// ==========================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let authReady = false;


// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;
  authReady = true;

  console.log(
    user
      ? "🇧🇩 Logged in: " + user.email
      : "👤 Not logged in"
  );

  if (user) {
    await createUserProfile(user);
  }

  await loadPosts();

});


// ==========================================
// USER PROFILE
// ==========================================

async function createUserProfile(user) {

  try {

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {

      const emailName =
        user.email
          ? user.email.split("@")[0]
          : "user";

      await setDoc(userRef, {

        uid: user.uid,

        email: user.email || "",

        name:
          user.displayName ||
          emailName,

        username:
          emailName.toLowerCase(),

        bio: "BanglaGram user 🇧🇩",

        followers: [],

        following: [],

        createdAt: serverTimestamp()

      });

    }

  } catch (error) {

    console.error(
      "User profile error:",
      error
    );

  }

}


// ==========================================
// SIGN UP
// ==========================================

export async function signup(
  email,
  password,
  name
) {

  email = String(email || "").trim();
  password = String(password || "");
  name = String(name || "").trim();

  if (!email || !password) {

    alert("Please enter email and password.");

    return false;

  }

  if (password.length < 6) {

    alert(
      "Password must be at least 6 characters."
    );

    return false;

  }

  try {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    if (name) {

      await updateProfile(
        result.user,
        {
          displayName: name
        }
      );

    }

    await createUserProfile(
      result.user
    );

    alert(
      "Account created successfully! 🇧🇩"
    );

    return true;

  } catch (error) {

    console.error(
      "Signup error:",
      error
    );

    alert(
      getFirebaseError(error)
    );

    return false;

  }

}


// ==========================================
// LOGIN
// ==========================================

export async function login(
  email,
  password
) {

  email = String(email || "").trim();
  password = String(password || "");

  if (!email || !password) {

    alert(
      "Please enter email and password."
    );

    return false;

  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert(
      "Welcome back to BanglaGram! 🇧🇩"
    );

    return true;

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    alert(
      getFirebaseError(error)
    );

    return false;

  }

}


// ==========================================
// LOGOUT
// ==========================================

export async function logout() {

  try {

    await signOut(auth);

    alert(
      "Logged out successfully."
    );

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

    alert(
      "Logout failed."
    );

  }

}


// ==========================================
// CREATE POST
// ==========================================

export async function createPost() {

  if (!authReady) {

    alert(
      "Please wait a moment and try again."
    );

    return;

  }

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }

  const captionElement =
    document.getElementById(
      "postCaption"
    );

  if (!captionElement) {

    console.error(
      "postCaption element not found."
    );

    alert(
      "Post box is missing from the page."
    );

    return;

  }

  const caption =
    captionElement.value.trim();

  if (!caption) {

    alert(
      "Please write something for your post."
    );

    return;

  }

  if (caption.length > 500) {

    alert(
      "Post must be 500 characters or less."
    );

    return;

  }

  try {

    const userName =
      currentUser.displayName ||
      (
        currentUser.email
          ? currentUser.email.split("@")[0]
          : "BanglaGram User"
      );

    await addDoc(
      collection(db, "posts"),
      {

        caption,

        userId:
          currentUser.uid,

        userName,

        userEmail:
          currentUser.email || "",

        likes: [],

        comments: [],

        createdAt:
          serverTimestamp()

      }
    );

    captionElement.value = "";

    updateCharacterCount();

    alert(
      "Post published! 🎉"
    );

    showHome();

  } catch (error) {

    console.error(
      "CREATE POST ERROR:",
      error
    );

    alert(
      "Post failed:\n\n" +
      getFirebaseError(error)
    );

  }

}


// ==========================================
// LOAD POSTS
// ==========================================

export async function loadPosts() {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) {

    console.warn(
      "Feed element not found."
    );

    return;

  }

  feed.innerHTML = `
    <div class="card">
      Loading BanglaGram posts... ⏳
    </div>
  `;

  try {

    const postsRef =
      collection(
        db,
        "posts"
      );

    const postsQuery =
      query(
        postsRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const snapshot =
      await getDocs(
        postsQuery
      );

    feed.innerHTML = "";

    if (snapshot.empty) {

      feed.innerHTML = `
        <div class="card">
          <h2>No posts yet 👀</h2>

          <p>
            Be the first person to post
            on BanglaGram! 🇧🇩
          </p>
        </div>
      `;

      updatePostCount(0);

      return;

    }

    let count = 0;

    snapshot.forEach(
      (postDoc) => {

        renderPost(
          postDoc.id,
          postDoc.data()
        );

        count++;

      }
    );

    updatePostCount(
      count
    );

  } catch (error) {

    console.error(
      "LOAD POSTS ERROR:",
      error
    );

    /*
      Fallback:
      If orderBy causes an index/timestamp problem,
      load posts without ordering instead of killing
      the whole feed.
    */

    try {

      const fallbackSnapshot =
        await getDocs(
          collection(
            db,
            "posts"
          )
        );

      feed.innerHTML = "";

      if (fallbackSnapshot.empty) {

        feed.innerHTML = `
          <div class="card">
            <h2>No posts yet 👀</h2>
            <p>
              Be the first person to post!
            </p>
          </div>
        `;

        updatePostCount(0);

        return;

      }

      const posts = [];

      fallbackSnapshot.forEach(
        (postDoc) => {

          posts.push({
            id: postDoc.id,
            data: postDoc.data()
          });

        }
      );

      posts.sort(
        (a, b) => {

          const aTime =
            getTimeValue(
              a.data.createdAt
            );

          const bTime =
            getTimeValue(
              b.data.createdAt
            );

          return bTime - aTime;

        }
      );

      posts.forEach(
        (post) => {

          renderPost(
            post.id,
            post.data
          );

        }
      );

      updatePostCount(
        posts.length
      );

    } catch (fallbackError) {

      console.error(
        "FALLBACK ERROR:",
        fallbackError
      );

      feed.innerHTML = `
        <div class="card">
          <h2>Unable to load posts</h2>

          <p>
            ${escapeHTML(
              fallbackError.message
            )}
          </p>

          <button
            class="primary"
            onclick="window.loadPosts()"
          >
            🔄 Try Again
          </button>
        </div>
      `;

    }

  }

}


// ==========================================
// TIME HELPER
// ==========================================

function getTimeValue(
  timestamp
) {

  if (!timestamp) return 0;

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();

  }

  if (
    timestamp.seconds
  ) {

    return (
      timestamp.seconds * 1000
    );

  }

  return 0;

}


// ==========================================
// RENDER POST
// ==========================================

function renderPost(
  postId,
  post
) {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) return;

  const likes =
    Array.isArray(post.likes)
      ? post.likes
      : [];

  const comments =
    Array.isArray(post.comments)
      ? post.comments
      : [];

  const liked =
    currentUser
      ? likes.includes(
          currentUser.uid
        )
      : false;

  const userName =
    post.userName ||
    "BanglaGram User";

  const safeName =
    escapeHTML(
      userName
    );

  const safeCaption =
    escapeHTML(
      post.caption || ""
    );

  const html = `

    <article
      class="card"
      id="post-${postId}"
    >

      <div class="post-header">

        <div class="avatar-small">
          🇧🇩
        </div>

        <div>

          <b>
            ${safeName}
          </b>

          <small>
            @banglagram
          </small>

        </div>

      </div>

      <p class="caption">
        ${safeCaption}
      </p>

      <div class="post-actions">

        <button
          onclick="window.likePost('${postId}')"
          class="${liked ? "liked" : ""}"
        >

          ${liked ? "❤️" : "🤍"}
          ${likes.length}

        </button>

        <button
          onclick="window.commentPost('${postId}')"
        >

          💬 Comment
          ${
            comments.length
              ? `(${comments.length})`
              : ""
          }

        </button>

        <button
          onclick="window.sharePost('${postId}')"
        >

          ↗️ Share

        </button>

        ${
          currentUser &&
          currentUser.uid === post.userId
            ? `
              <button
                onclick="window.deletePost('${postId}')"
              >
                🗑️
              </button>
            `
            : ""
        }

      </div>

      <div
        id="comments-${postId}"
        class="comments"
      ></div>

    </article>

  `;

  feed.insertAdjacentHTML(
    "beforeend",
    html
  );

}


// ==========================================
// LIKE
// ==========================================

export async function likePost(
  postId
) {

  if (!currentUser) {

    alert(
      "Login to like posts ❤️"
    );

    return;

  }

  try {

    const postRef =
      doc(
        db,
        "posts",
        postId
      );

    const snapshot =
      await getDoc(
        postRef
      );

    if (!snapshot.exists()) {

      alert(
        "Post no longer exists."
      );

      return;

    }

    const data =
      snapshot.data();

    const likes =
      Array.isArray(data.likes)
        ? data.likes
        : [];

    if (
      likes.includes(
        currentUser.uid
      )
    ) {

      await updateDoc(
        postRef,
        {

          likes:
            arrayRemove(
              currentUser.uid
            )

        }
      );

    } else {

      await updateDoc(
        postRef,
        {

          likes:
            arrayUnion(
              currentUser.uid
            )

        }
      );

    }

    await loadPosts();

  } catch (error) {

    console.error(
      "LIKE ERROR:",
      error
    );

    alert(
      "Like failed:\n" +
      getFirebaseError(error)
    );

  }

}


// ==========================================
// COMMENT
// ==========================================

export async function commentPost(
  postId
) {

  if (!currentUser) {

    alert(
      "Login to comment."
    );

    return;

  }

  const text =
    prompt(
      "Write your comment:"
    );

  if (!text || !text.trim()) {
    return;
  }

  try {

    const postRef =
      doc(
        db,
        "posts",
        postId
      );

    const snapshot =
      await getDoc(
        postRef
      );

    if (!snapshot.exists()) {

      alert(
        "Post no longer exists."
      );

      return;

    }

    const data =
      snapshot.data();

    const comments =
      Array.isArray(data.comments)
        ? [...data.comments]
        : [];

    comments.push({

      id:
        Date.now(),

      userId:
        currentUser.uid,

      userName:
        currentUser.displayName ||
        (
          currentUser.email
            ? currentUser.email.split("@")[0]
            : "User"
        ),

      text:
        text.trim(),

      createdAt:
        new Date().toISOString()

    });

    await updateDoc(
      postRef,
      {
        comments
      }
    );

    alert(
      "Comment added! 💬"
    );

    await loadPosts();

  } catch (error) {

    console.error(
      "COMMENT ERROR:",
      error
    );

    alert(
      "Comment failed:\n" +
      getFirebaseError(error)
    );

  }

}


// ==========================================
// DELETE
// ==========================================

export async function deletePost(
  postId
) {

  if (!currentUser) return;

  const confirmDelete =
    confirm(
      "Delete this post?"
    );

  if (!confirmDelete) return;

  try {

    const postRef =
      doc(
        db,
        "posts",
        postId
      );

    const snapshot =
      await getDoc(
        postRef
      );

    if (!snapshot.exists()) {

      alert(
        "Post already deleted."
      );

      await loadPosts();

      return;

    }

    if (
      snapshot.data().userId !==
      currentUser.uid
    ) {

      alert(
        "You can only delete your own post."
      );

      return;

    }

    await deleteDoc(
      postRef
    );

    alert(
      "Post deleted."
    );

    await loadPosts();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      "Delete failed:\n" +
      getFirebaseError(error)
    );

  }

}


// ==========================================
// SHARE
// ==========================================

export async function sharePost(
  postId
) {

  const url =
    window.location.origin +
    window.location.pathname +
    "?post=" +
    encodeURIComponent(
      postId
    );

  try {

    if (
      navigator.share
    ) {

      await navigator.share({

        title:
          "BanglaGram 🇧🇩",

        text:
          "Check this post on BanglaGram!",

        url

      });

      return;

    }

    if (
      navigator.clipboard
    ) {

      await navigator.clipboard.writeText(
        url
      );

      alert(
        "Post link copied! 🔗"
      );

      return;

    }

    prompt(
      "Copy this link:",
      url
    );

  } catch (error) {

    console.log(
      "Share cancelled:",
      error
    );

  }

}


// ==========================================
// SHOW HOME
// ==========================================

export function showHome() {

  document
    .getElementById("homePage")
    ?.classList
    .remove("hidden");

  document
    .getElementById("createPage")
    ?.classList
    .add("hidden");

  document
    .getElementById("profilePage")
    ?.classList
    .add("hidden");

  loadPosts();

}


// ==========================================
// SHOW CREATE
// ==========================================

export function showCreate() {

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }

  document
    .getElementById("homePage")
    ?.classList
    .add("hidden");

  document
    .getElementById("createPage")
    ?.classList
    .remove("hidden");

  document
    .getElementById("profilePage")
    ?.classList
    .add("hidden");

  updateCharacterCount();

}


// ==========================================
// SHOW PROFILE
// ==========================================

export function showProfile() {

  document
    .getElementById("homePage")
    ?.classList
    .add("hidden");

  document
    .getElementById("createPage")
    ?.classList
    .add("hidden");

  document
    .getElementById("profilePage")
    ?.classList
    .remove("hidden");

}


// ==========================================
// CHARACTER COUNTER
// ==========================================

function updateCharacterCount() {

  const textarea =
    document.getElementById(
      "postCaption"
    );

  const counter =
    document.getElementById(
      "charCount"
    );

  if (
    !textarea ||
    !counter
  ) return;

  counter.textContent =
    textarea.value.length;

}


// ==========================================
// POST COUNT
// ==========================================

function updatePostCount(
  count
) {

  const element =
    document.getElementById(
      "postCount"
    );

  if (element) {

    element.textContent =
      count;

  }

}


// ==========================================
// FIREBASE ERROR
// ==========================================

function getFirebaseError(
  error
) {

  const code =
    error?.code || "";

  const errors = {

    "auth/email-already-in-use":
      "This email is already registered.",

    "auth/invalid-email":
      "Invalid email address.",

    "auth/weak-password":
      "Password should be at least 6 characters.",

    "auth/invalid-credential":
      "Wrong email or password.",

    "auth/user-not-found":
      "Account not found.",

    "auth/wrong-password":
      "Wrong password.",

    "auth/network-request-failed":
      "Internet connection problem.",

    "permission-denied":
      "Firebase permission denied. Check Firestore Security Rules.",

    "failed-precondition":
      "Firebase database configuration problem.",

    "unavailable":
      "Firebase is temporarily unavailable."

  };

  return (
    errors[code] ||
    error?.message ||
    "Something went wrong."
  );

}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(
  text
) {

  return String(text)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


// ==========================================
// CHARACTER COUNTER EVENT
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const textarea =
      document.getElementById(
        "postCaption"
      );

    if (textarea) {

      textarea.addEventListener(
        "input",
        updateCharacterCount
      );

      updateCharacterCount();

    }

  }
);


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

window.likePost =
  likePost;

window.commentPost =
  commentPost;

window.sharePost =
  sharePost;

window.deletePost =
  deletePost;

window.createPost =
  createPost;

window.showHome =
  showHome;

window.showCreate =
  showCreate;

window.showProfile =
  showProfile;

window.signup =
  signup;

window.login =
  login;

window.logout =
  logout;

window.loadPosts =
  loadPosts;


// ==========================================
// READY
// ==========================================

console.log(
  "🇧🇩 BanglaGram app.js loaded successfully."
);
