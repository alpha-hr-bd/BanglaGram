// ==========================================
// 🇧🇩 BANGLAGRAM
// Real Firebase Social Platform
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

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

  databaseURL:
    "https://bangla-gram123-default-rtdb.firebaseio.com",

  projectId: "bangla-gram123",

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
// INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ==========================================
// CURRENT USER
// ==========================================

let currentUser = null;


// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (user) {

    console.log("Logged in:", user.email);

    await createUserProfile(user);

    loadPosts();

  } else {

    console.log("Not logged in");

    loadPosts();

  }

});


// ==========================================
// CREATE USER PROFILE
// ==========================================

async function createUserProfile(user) {

  try {

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {

      await setDoc(userRef, {

        uid: user.uid,

        email: user.email,

        name:
          user.displayName ||
          user.email.split("@")[0],

        username:
          user.email
            .split("@")[0]
            .toLowerCase(),

        bio: "BanglaGram user 🇧🇩",

        followers: [],

        following: [],

        createdAt:
          serverTimestamp()

      });

    }

  } catch (error) {

    console.error(
      "Profile error:",
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

  try {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await updateProfile(
      result.user,
      {
        displayName: name
      }
    );

    await createUserProfile(
      result.user
    );

    alert(
      "Account created successfully! 🇧🇩"
    );

    return true;

  } catch (error) {

    console.error(error);

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

    console.error(error);

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

    console.error(error);

  }

}


// ==========================================
// CREATE POST
// ==========================================

export async function createPost() {

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }


  const titleElement =
    document.getElementById(
      "postTitle"
    );

  const captionElement =
    document.getElementById(
      "postCaption"
    );

  const mediaElement =
    document.getElementById(
      "mediaUrl"
    );


  const title =
    titleElement.value.trim();

  const caption =
    captionElement.value.trim();

  const media =
    mediaElement.value.trim();


  if (!title) {

    alert(
      "Please enter a title."
    );

    return;

  }


  try {

    await addDoc(
      collection(
        db,
        "posts"
      ),
      {

        title: title,

        caption: caption,

        media: media,

        userId:
          currentUser.uid,

        userName:
          currentUser.displayName ||
          currentUser.email
            .split("@")[0],

        userEmail:
          currentUser.email,

        likes: [],

        comments: [],

        createdAt:
          serverTimestamp()

      }
    );


    titleElement.value = "";

    captionElement.value = "";

    mediaElement.value = "";


    alert(
      "Post published! 🎉"
    );


    showHome();

    loadPosts();

  } catch (error) {

    console.error(error);

    alert(
      "Post failed: " +
      error.message
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
    <div class="card">
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


    feed.innerHTML = "";


    if (snapshot.empty) {

      feed.innerHTML = `
        <div class="card">
          <h2>No posts yet 👀</h2>
          <p>Be the first person to post on BanglaGram!</p>
        </div>
      `;

      updatePostCount(0);

      return;

    }


    let count = 0;


    snapshot.forEach(
      (postDoc) => {

        const post =
          postDoc.data();

        renderPost(
          postDoc.id,
          post
        );

        count++;

      }
    );


    updatePostCount(
      count
    );


  } catch (error) {

    console.error(error);


    feed.innerHTML = `
      <div class="card">
        <h2>Unable to load posts</h2>
        <p>${escapeHTML(
          error.message
        )}</p>
      </div>
    `;

  }

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


  const likes =
    post.likes || [];


  const liked =
    currentUser &&
    likes.includes(
      currentUser.uid
    );


  let mediaHTML = "";


  if (post.media) {

    const media =
      post.media.toLowerCase();


    if (

      media.includes(
        ".mp4"
      ) ||

      media.includes(
        ".webm"
      ) ||

      media.includes(
        ".mov"
      )

    ) {

      mediaHTML = `

        <video
          class="post-media"
          controls
          preload="metadata"
        >

          <source
            src="${escapeHTML(
              post.media
            )}"
          >

        </video>

      `;

    } else {

      mediaHTML = `

        <img
          class="post-media"
          src="${escapeHTML(
            post.media
          )}"
          onerror="this.style.display='none'"
        >

      `;

    }

  }


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
            ${escapeHTML(
              post.userName ||
              "BanglaGram User"
            )}
          </b>

          <small>
            @banglagram
          </small>

        </div>

      </div>


      ${mediaHTML}


      <h2 class="post-title">

        ${escapeHTML(
          post.title ||
          ""
        )}

      </h2>


      <p class="caption">

        ${escapeHTML(
          post.caption ||
          ""
        )}

      </p>


      <div class="post-actions">

        <button
          onclick="window.likePost('${postId}')"
          class="${
            liked
              ? "liked"
              : ""
          }"
        >

          ${
            liked
              ? "❤️"
              : "🤍"
          }

          ${likes.length}

        </button>


        <button
          onclick="window.commentPost('${postId}')"
        >

          💬 Comment

        </button>


        <button
          onclick="window.sharePost('${postId}')"
        >

          ↗️ Share

        </button>


        ${
          currentUser &&
          currentUser.uid ===
            post.userId

          ?

          `

          <button
            onclick="window.deletePost('${postId}')"
          >

            🗑️

          </button>

          `

          :

          ""

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
// LIKE POST
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


    const postSnap =
      await getDoc(
        postRef
      );


    if (!postSnap.exists()) return;


    const post =
      postSnap.data();


    const likes =
      post.likes || [];


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


    loadPosts();

  } catch (error) {

    console.error(error);

    alert(
      "Like failed."
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


  if (!text || !text.trim())
    return;


  try {

    const postRef =
      doc(
        db,
        "posts",
        postId
      );


    const postSnap =
      await getDoc(
        postRef
      );


    if (!postSnap.exists())
      return;


    const post =
      postSnap.data();


    const comments =
      post.comments || [];


    comments.push({

      id:
        Date.now(),

      userId:
        currentUser.uid,

      userName:
        currentUser.displayName ||
        currentUser.email
          .split("@")[0],

      text:
        text.trim(),

      createdAt:
        new Date().toISOString()

    });


    await updateDoc(
      postRef,
      {
        comments:
          comments
      }
    );


    alert(
      "Comment added! 💬"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Comment failed."
    );

  }

}


// ==========================================
// DELETE POST
// ==========================================

export async function deletePost(
  postId
) {

  if (!currentUser)
    return;


  const yes =
    confirm(
      "Delete this post?"
    );


  if (!yes)
    return;


  try {

    await deleteDoc(
      doc(
        db,
        "posts",
        postId
      )
    );


    alert(
      "Post deleted."
    );


    loadPosts();

  } catch (error) {

    console.error(error);

    alert(
      "Delete failed."
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
    postId;


  if (
    navigator.share
  ) {

    try {

      await navigator.share({

        title:
          "BanglaGram 🇧🇩",

        text:
          "Check this post on BanglaGram!",

        url:
          url

      });

    } catch {}

  } else {

    await navigator.clipboard.writeText(
      url
    );

    alert(
      "Post link copied! 🔗"
    );

  }

}


// ==========================================
// UI
// ==========================================

export function showHome() {

  document
    .getElementById(
      "homePage"
    )
    ?.classList
    .remove("hidden");


  document
    .getElementById(
      "createPage"
    )
    ?.classList
    .add("hidden");


  document
    .getElementById(
      "profilePage"
    )
    ?.classList
    .add("hidden");


  loadPosts();

}


export function showCreate() {

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }


  document
    .getElementById(
      "homePage"
    )
    ?.classList
    .add("hidden");


  document
    .getElementById(
      "createPage"
    )
    ?.classList
    .remove("hidden");


  document
    .getElementById(
      "profilePage"
    )
    ?.classList
    .add("hidden");

}


export function showProfile() {

  document
    .getElementById(
      "homePage"
    )
    ?.classList
    .add("hidden");


  document
    .getElementById(
      "createPage"
    )
    ?.classList
    .add("hidden");


  document
    .getElementById(
      "profilePage"
    )
    ?.classList
    .remove("hidden");

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
// FIREBASE ERRORS
// ==========================================

function getFirebaseError(
  error
) {

  const code =
    error.code || "";


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
      "Wrong password."

  };


  return (
    errors[code] ||
    error.message ||
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
