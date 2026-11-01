import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let lastPost = null;
let loading = false;

export async function createPost(text, imageUrl = "") {
  const user = auth.currentUser;

  if (!user) throw new Error("Please login first.");
  if (!text.trim() && !imageUrl.trim()) {
    throw new Error("Write something or add an image URL.");
  }

  await addDoc(collection(db, "posts"), {
    uid: user.uid,
    author: user.displayName || "BanglaGram User",
    text: text.trim(),
    imageUrl: imageUrl.trim(),
    likes: 0,
    comments: 0,
    createdAt: serverTimestamp()
  });
}

export async function loadPosts(reset = false) {
  if (loading) return;

  loading = true;

  const feed = document.getElementById("feed");

  if (reset) {
    feed.innerHTML = "";
    lastPost = null;
  }

  try {
    let q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    if (lastPost) {
      q = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastPost),
        limit(10)
      );
    }

    const snapshot = await getDocs(q);

    snapshot.forEach((postDoc) => {
      renderPost(postDoc.id, postDoc.data());
    });

    if (!snapshot.empty) {
      lastPost = snapshot.docs[snapshot.docs.length - 1];
    }

    if (snapshot.empty && reset) {
      feed.innerHTML = "<p>No posts yet. Be the first to post!</p>";
    }

  } catch (error) {
    console.error(error);
    feed.innerHTML = "<p>Could not load posts. Check Firestore setup.</p>";
  } finally {
    loading = false;
  }
}

function renderPost(id, post) {
  const feed = document.getElementById("feed");

  const card = document.createElement("article");
  card.className = "post-card";

  const title = document.createElement("h3");
  title.textContent = post.author || "BanglaGram User";

  const meta = document.createElement("div");
  meta.className = "post-meta";
  meta.textContent = "BanglaGram member";

  const content = document.createElement("p");
  content.textContent = post.text || "";

  card.append(title, meta, content);

  if (post.imageUrl) {
    const image = document.createElement("img");
    image.className = "post-image";
    image.src = post.imageUrl;
    image.alt = "Post image";
    image.loading = "lazy";
    image.onerror = () => image.remove();
    card.appendChild(image);
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const likeBtn = document.createElement("button");
  likeBtn.textContent = `❤️ Like (${post.likes || 0})`;

  likeBtn.addEventListener("click", async () => {
    try {
      await toggleLike(id);
      likeBtn.textContent = "❤️ Liked";
    } catch (error) {
      alert(error.message);
    }
  });

  const commentBtn = document.createElement("button");
  commentBtn.textContent = `💬 Comments (${post.comments || 0})`;

  actions.append(likeBtn, commentBtn);
  card.appendChild(actions);

  const commentArea = document.createElement("div");
  commentArea.hidden = true;

  const commentInput = document.createElement("input");
  commentInput.className = "comment-input";
  commentInput.placeholder = "Write a comment...";

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";

  const commentList = document.createElement("div");

  sendBtn.addEventListener("click", async () => {
    try {
      await addComment(id, commentInput.value);
      commentInput.value = "";
      await showComments(id, commentList);
    } catch (error) {
      alert(error.message);
    }
  });

  commentBtn.addEventListener("click", async () => {
    commentArea.hidden = !commentArea.hidden;
    if (!commentArea.hidden) {
      await showComments(id, commentList);
    }
  });

  commentArea.append(commentInput, sendBtn, commentList);
  card.appendChild(commentArea);

  feed.appendChild(card);
}

export async function toggleLike(postId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first.");

  const likeRef = doc(db, "posts", postId, "likes", user.uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
  } else {
    await setDoc(likeRef, {
      uid: user.uid,
      createdAt: serverTimestamp()
    });
  }
}

export async function addComment(postId, text) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first.");
  if (!text.trim()) throw new Error("Write a comment first.");

  await addDoc(
    collection(db, "posts", postId, "comments"),
    {
      uid: user.uid,
      author: user.displayName || "BanglaGram User",
      text: text.trim(),
      createdAt: serverTimestamp()
    }
  );
}

export async function showComments(postId, container) {
  container.innerHTML = "";

  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc"),
    limit(50)
  );

  const snapshot = await getDocs(q);

  snapshot.forEach((item) => {
    const comment = document.createElement("div");
    comment.className = "comment";

    const author = document.createElement("strong");
    author.textContent = item.data().author + ": ";

    const text = document.createElement("span");
    text.textContent = item.data().text;

    comment.append(author, text);
    container.appendChild(comment);
  });
}
