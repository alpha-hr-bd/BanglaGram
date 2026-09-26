```javascript
// ==========================================
// 🇧🇩 BANGLAGRAM
// Firebase Social Platform
// Stable Full App
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
// FIREBASE
// ==========================================

const firebaseConfig = {

  apiKey:
    "AIzaSyBoHOzek_SvrL_OA7BNyPGNL3NBEZz1ppM",

  authDomain:
    "bangla-gram123.firebaseapp.com",

  databaseURL:
    "https://bangla-gram123-default-rtdb.firebaseio.com",

  projectId:
    "bangla-gram123",

  storageBucket:
    "bangla-gram123.firebasestorage.app",

  messagingSenderId:
    "506223922726",

  appId:
    "1:506223922726:web:0cae6cc35330e3b68ba0e7",

  measurementId:
    "G-3SP9PSJZ82"

};


// ==========================================
// INITIALIZE
// ==========================================

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);

let currentUser = null;
let authReady = false;
let authMode = "login";


// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(
  auth,
  async (user) => {

    currentUser = user;
    authReady = true;

    updateAuthUI();

    if (user) {

      await createUserProfile(user);

      updateProfileUI();

    } else {

      updateProfileUI();

    }

    await loadPosts();

  }
);


// ==========================================
// USER PROFILE
// ==========================================

async function createUserProfile(user) {

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );

    const snapshot =
      await getDoc(
        userRef
      );

    if (!snapshot.exists()) {

      const emailName =
        user.email
          ? user.email.split("@")[0]
          : "user";

      await setDoc(
        userRef,
        {

          uid:
            user.uid,

          email:
            user.email || "",

          name:
            user.displayName ||
            emailName,

          username:
            emailName.toLowerCase(),

          bio:
            "BanglaGram user 🇧🇩",

          followers: [],

          following: [],

          createdAt:
            serverTimestamp()

        }
      );

    }

  } catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }

}


// ==========================================
// SIGNUP
// ==========================================

export async function signup(
  email,
  password,
  name
) {

  try {

    email =
      String(email || "").trim();

    password =
      String(password || "");

    name =
      String(name || "").trim();

    if (!email) {

      showToast(
        "Please enter your email."
      );

      return false;

    }

    if (password.length < 6) {

      showToast(
        "Password needs 6+ characters."
      );

      return false;

    }

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

    closeAuth();

    showToast(
      "Account created successfully! 🇧🇩"
    );

    return true;

  } catch (error) {

    console.error(
      "SIGNUP ERROR:",
      error
    );

    showToast(
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

  try {

    email =
      String(email || "").trim();

    password =
      String(password || "");

    if (!email || !password) {

      showToast(
        "Enter email and password."
      );

      return false;

    }

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    closeAuth();

    showToast(
      "Welcome back! 🇧🇩"
    );

    return true;

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    showToast(
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

    showToast(
      "Logged out successfully."
    );

    showHome();

  } catch (error) {

    console.error(
      "LOGOUT ERROR:",
      error
    );

    showToast(
      "Logout failed."
    );

  }

}


// ==========================================
// CREATE POST
// ==========================================

export async function createPost() {

  if (!authReady) {

    showToast(
      "Please wait a moment."
    );

    return;

  }

  if (!currentUser) {

    openAuth("login");

    return;

  }

  const textarea =
    document.getElementById(
      "postCaption"
    );

  if (!textarea) {

    showToast(
      "Post box not found."
    );

    return;

  }

  const caption =
    textarea.value.trim();

  if (!caption) {

    showToast(
      "Write something first ✍️"
    );

    return;

  }

  if (caption.length > 500) {

    showToast(
      "Maximum 500 characters."
    );

    return;

  }

  try {

    const name =
      currentUser.displayName ||
      (
        currentUser.email
          ? currentUser.email.split("@")[0]
          : "BanglaGram User"
      );

    await addDoc(
      collection(
        db,
        "posts"
      ),
      {

        caption,

        userId:
          currentUser.uid,

        userName:
          name,

        userEmail:
          currentUser.email || "",

        likes: [],

        comments: [],

        createdAt:
          serverTimestamp()

      }
    );

    textarea.value = "";

    updateCharacterCount();

    showToast(
      "Post published! 🎉"
    );

    showHome();

  } catch (error) {

    console.error(
      "CREATE POST ERROR:",
      error
    );

    showToast(
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

  if (!feed) return;

  feed.innerHTML = `
    <div class="card loading-card">
      Loading BanglaGram posts... ⏳
    </div>
  `;

  try {

    const postsQuery =
      query(
        collection(
          db,
          "posts"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const snapshot =
      await getDocs(
        postsQuery
      );

    renderPosts(
      snapshot
    );

  } catch (error) {

    console.error(
      "ORDERED LOAD ERROR:",
      error
    );

    /*
      Fallback without orderBy.
      This prevents the entire feed from
      dying if Firestore needs an index.
    */

    try {

      const snapshot =
        await getDocs(
          collection(
            db,
            "posts"
          )
        );

      renderFallbackPosts(
        snapshot
      );

    } catch (fallbackError) {

      console.error(
        "FALLBACK ERROR:",
        fallbackError
      );

      feed.innerHTML = `
        <div class="card">
          <h3>Unable to load posts.</h3>

          <p style="margin-top:8px;color:#748297;">
            ${escapeHTML(
              getFirebaseError(
                fallbackError
              )
            )}
          </p>

          <button
            class="primary"
            style="margin-top:15px;"
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
// RENDER ORDERED
// ==========================================

function renderPosts(
  snapshot
) {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) return;

  feed.innerHTML = "";

  if (snapshot.empty) {

    showEmptyFeed();

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

}


// ==========================================
// FALLBACK POSTS
// ==========================================

function renderFallbackPosts(
  snapshot
) {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) return;

  feed.innerHTML = "";

  if (snapshot.empty) {

    showEmptyFeed();

    return;

  }

  const posts = [];

  snapshot.forEach(
    (postDoc) => {

      posts.push({
        id: postDoc.id,
        data: postDoc.data()
      });

    }
  );

  posts.sort(
    (a, b) => {

      return (
        getTimeValue(
          b.data.createdAt
        ) -
        getTimeValue(
          a.data.createdAt
        )
      );

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

}


// ==========================================
// EMPTY FEED
// ==========================================

function showEmptyFeed() {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) return;

  feed.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:40px;">
        🇧🇩
      </div>

      <h2 style="margin-top:10px;">
        No posts yet
      </h2>

      <p style="margin-top:7px;color:#748297;">
        Be the first person to post on BanglaGram!
      </p>

      <button
        class="primary"
        style="margin-top:16px;"
        onclick="window.showCreate()"
      >
        ✍️ Create First Post
      </button>
    </div>
  `;

  updatePostCount(0);

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
    currentUser &&
    likes.includes(
      currentUser.uid
    );

  const userName =
    post.userName ||
    "BanglaGram User";

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
            ${escapeHTML(userName)}
          </b>

          <small>
            @banglagram
          </small>

        </div>

      </div>

      <p class="caption">
        ${escapeHTML(
          post.caption || ""
        )}
      </p>

      <div class="post-actions">

        <button
          type="button"
          onclick="window.likePost('${postId}')"
          class="${liked ? "liked" : ""}"
        >
          ${liked ? "❤️" : "🤍"}
          ${likes.length}
        </button>

        <button
          type="button"
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
          type="button"
          onclick="window.sharePost('${postId}')"
        >
          ↗️ Share
        </button>

        ${
          currentUser &&
          currentUser.uid === post.userId
            ? `
              <button
                type="button"
                onclick="window.deletePost('${postId}')"
              >
                🗑️ Delete
              </button>
            `
            : ""
        }

      </div>

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

    openAuth("login");

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

      showToast(
        "Post no longer exists."
      );

      await loadPosts();

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

    showToast(
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

    openAuth("login");

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

      showToast(
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

    showToast(
      "Comment added! 💬"
    );

    await loadPosts();

  } catch (error) {

    console.error(
      "COMMENT ERROR:",
      error
    );

    showToast(
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

  if (
    !confirm(
      "Delete this post?"
    )
  ) {
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

      showToast(
        "Post already deleted."
      );

      await loadPosts();

      return;

    }

    if (
      snapshot.data().userId !==
      currentUser.uid
    ) {

      showToast(
        "You can only delete your own post."
      );

      return;

    }

    await deleteDoc(
      postRef
    );

    showToast(
      "Post deleted."
    );

    await loadPosts();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    showToast(
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

      showToast(
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
      "Share cancelled."
    );

  }

}


// ==========================================
// NAVIGATION
// ==========================================

export function showHome() {

  setPage(
    "homePage"
  );

  loadPosts();

}


export function showCreate() {

  if (!currentUser) {

    openAuth("login");

    return;

  }

  setPage(
    "createPage"
  );

  updateCharacterCount();
  updateCreateUser();

}


export function showProfile() {

  setPage(
    "profilePage"
  );

  updateProfileUI();

}


function setPage(
  pageId
) {

  const pages =
    [
      "homePage",
      "createPage",
      "profilePage"
    ];

  pages.forEach(
    (id) => {

      const element =
        document.getElementById(
          id
        );

      if (!element) return;

      element.classList.toggle(
        "hidden",
        id !== pageId
      );

    }
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// ==========================================
// AUTH MODAL
// ==========================================

export function openAuth(
  mode = "login"
) {

  authMode =
    mode === "signup"
      ? "signup"
      : "login";

  updateAuthModal();

  document
    .getElementById(
      "authModal"
    )
    ?.classList
    .remove("hidden");

}


export function closeAuth() {

  document
    .getElementById(
      "authModal"
    )
    ?.classList
    .add("hidden");

}


export function toggleAuthMode() {

  authMode =
    authMode === "login"
      ? "signup"
      : "login";

  updateAuthModal();

}


function updateAuthModal() {

  const title =
    document.getElementById(
      "authTitle"
    );

  const subtitle =
    document.getElementById(
      "authSubtitle"
    );

  const nameField =
    document.getElementById(
      "nameField"
    );

  const submit =
    document.getElementById(
      "authSubmitBtn"
    );

  const switchText =
    document.getElementById(
      "authSwitchText"
    );

  const switchButton =
    document.getElementById(
      "authSwitchBtn"
    );

  if (
    !title ||
    !subtitle ||
    !nameField ||
    !submit ||
    !switchText ||
    !switchButton
  ) {
    return;
  }

  if (
    authMode === "signup"
  ) {

    title.textContent =
      "Join BanglaGram";

    subtitle.textContent =
      "Create your free BanglaGram account.";

    nameField.classList.remove(
      "hidden"
    );

    submit.textContent =
      "Create Account";

    switchText.textContent =
      "Already have an account?";

    switchButton.textContent =
      "Login";

  } else {

    title.textContent =
      "Welcome Back";

    subtitle.textContent =
      "Login to continue to BanglaGram.";

    nameField.classList.add(
      "hidden"
    );

    submit.textContent =
      "Login";

    switchText.textContent =
      "Don't have an account?";

    switchButton.textContent =
      "Sign up";

  }

}


// ==========================================
// AUTH SUBMIT
// ==========================================

export async function submitAuth() {

  const email =
    document.getElementById(
      "authEmail"
    )?.value;

  const password =
    document.getElementById(
      "authPassword"
    )?.value;

  const name =
    document.getElementById(
      "authName"
    )?.value;

  const button =
    document.getElementById(
      "authSubmitBtn"
    );

  if (button) {

    button.disabled = true;

    button.textContent =
      "Please wait...";

  }

  let success = false;

  if (
    authMode === "signup"
  ) {

    success =
      await signup(
        email,
        password,
        name
      );

  } else {

    success =
      await login(
        email,
        password
      );

  }

  if (button) {

    button.disabled = false;

    updateAuthModal();

  }

  if (success) {

    document.getElementById(
      "authEmail"
    ).value = "";

    document.getElementById(
      "authPassword"
    ).value = "";

    document.getElementById(
      "authName"
    ).value = "";

  }

}


// ==========================================
// AUTH UI
// ==========================================

function updateAuthUI() {

  const loginBtn =
    document.getElementById(
      "loginNavBtn"
    );

  const signupBtn =
    document.getElementById(
      "signupNavBtn"
    );

  const logoutBtn =
    document.getElementById(
      "logoutNavBtn"
    );

  if (
    !loginBtn ||
    !signupBtn ||
    !logoutBtn
  ) {
    return;
  }

  if (currentUser) {

    loginBtn.classList.add(
      "hidden"
    );

    signupBtn.classList.add(
      "hidden"
    );

    logoutBtn.classList.remove(
      "hidden"
    );

  } else {

    loginBtn.classList.remove(
      "hidden"
    );

    signupBtn.classList.remove(
      "hidden"
    );

    logoutBtn.classList.add(
      "hidden"
    );

  }

}


// ==========================================
// PROFILE UI
// ==========================================

function updateProfileUI() {

  const name =
    document.getElementById(
      "profileName"
    );

  const email =
    document.getElementById(
      "profileEmail"
    );

  const bio =
    document.getElementById(
      "profileBio"
    );

  if (!name || !email || !bio) {
    return;
  }

  if (currentUser) {

    name.textContent =
      currentUser.displayName ||
      (
        currentUser.email
          ? currentUser.email.split("@")[0]
          : "BanglaGram User"
      );

    email.textContent =
      currentUser.email || "";

    bio.textContent =
      "BanglaGram user 🇧🇩";

  } else {

    name.textContent =
      "Guest User";

    email.textContent =
      "Login to see your profile.";

    bio.textContent =
      "Welcome to BanglaGram 🇧🇩";

  }

}


function updateCreateUser() {

  const element =
    document.getElementById(
      "createUserName"
    );

  if (!element) return;

  if (currentUser) {

    element.textContent =
      currentUser.displayName ||
      (
        currentUser.email
          ? currentUser.email.split("@")[0]
          : "BanglaGram User"
      );

  }

}


// ==========================================
// CHARACTER COUNT
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

  if (!textarea || !counter) {
    return;
  }

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
// SCROLL FEED
// ==========================================

export function scrollToFeed() {

  const section =
    document.getElementById(
      "feedSection"
    );

  if (!section) return;

  section.scrollIntoView({
    behavior: "smooth"
  });

}


// ==========================================
// TOAST
// ==========================================

function showToast(
  message
) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {

    console.log(message);

    return;

  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    window.__bgToastTimer
  );

  window.__bgToastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2800
    );

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
      "Password must be at least 6 characters.",

    "auth/invalid-credential":
      "Wrong email or password.",

    "auth/user-not-found":
      "Account not found.",

    "auth/wrong-password":
      "Wrong password.",

    "auth/network-request-failed":
      "Internet connection problem.",

    "auth/too-many-requests":
      "Too many attempts. Try again later.",

    "permission-denied":
      "Firebase permission denied. Check Firestore Rules.",

    "failed-precondition":
      "Firebase configuration/index problem.",

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
// TIME
// ==========================================

function getTimeValue(
  timestamp
) {

  if (!timestamp) {
    return 0;
  }

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();

  }

  if (
    typeof timestamp.seconds ===
    "number"
  ) {

    return (
      timestamp.seconds * 1000
    );

  }

  return 0;

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
// EVENTS
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

    }

    /*
      ESC closes auth modal.
    */

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape"
        ) {

          closeAuth();

        }

      }
    );

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

window.login =
  login;

window.signup =
  signup;

window.logout =
  logout;

window.loadPosts =
  loadPosts;

window.openAuth =
  openAuth;

window.closeAuth =
  closeAuth;

window.toggleAuthMode =
  toggleAuthMode;

window.submitAuth =
  submitAuth;

window.scrollToFeed =
  scrollToFeed;


// ==========================================
// READY
// ==========================================

console.log(
  "🇧🇩 BanglaGram loaded successfully."
);
```
