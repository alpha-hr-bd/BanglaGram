import { auth, db, storage } from "./firebase.js";
import {
  collection, addDoc, getDocs, query, orderBy, limit, startAfter,
  doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { createNotification } from "./notifications.js";

let lastPost = null;
let loading = false;
let activeTarget = "feed";

export async function uploadMedia(file, onProgress = () => {}) {
  if (!file) return { mediaUrl: "", mediaType: "" };
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Choose an image or video file.");
  if (file.size > 50 * 1024 * 1024) throw new Error("File is larger than 50 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `uploads/${auth.currentUser.uid}/${Date.now()}_${safeName}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  const url = await new Promise((resolve, reject) => {
    task.on("state_changed",
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => { try { resolve(await getDownloadURL(task.snapshot.ref)); } catch (e) { reject(e); } }
    );
  });
  return { mediaUrl: url, mediaType: isVideo ? "video" : "image" };
}

export async function createPost(text, mediaUrl = "", mediaType = "") {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");
  if (!text.trim() && !mediaUrl) throw new Error("Write something or select a picture/video.");
  await addDoc(collection(db, "posts"), {
    uid: user.uid, author: user.displayName || "BanglaGram member",
    text: text.trim(), mediaUrl, mediaType,
    imageUrl: mediaType === "image" ? mediaUrl : "",
    likes: 0, comments: 0, createdAt: serverTimestamp()
  });
}

export async function loadPosts(reset = false) {
  if (loading) return;
  loading = true;
  const feed = document.getElementById(activeTarget);
  if (!feed) { loading = false; return; }
  if (reset) { feed.innerHTML = ""; lastPost = null; }
  try {
    let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(12));
    if (lastPost) q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastPost), limit(12));
    const snap = await getDocs(q);
    for (const item of snap.docs) await renderPost(item.id, item.data(), feed);
    if (!snap.empty) lastPost = snap.docs[snap.docs.length - 1];
    if (snap.empty && reset) feed.innerHTML = '<div class="empty-state">No posts yet. Be the first to share a moment!</div>';
  } catch (e) {
    console.error(e);
    feed.innerHTML = '<div class="empty-state">Could not load posts. Check Firestore rules and any index link in the console.</div>';
  } finally { loading = false; }
}

export async function loadUserPosts(uid, container) {
  container.innerHTML = '<div class="empty-state">Loading posts...</div>';
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
    const snap = await getDocs(q);
    const own = snap.docs.filter(d => d.data().uid === uid);
    container.innerHTML = "";
    if (!own.length) { container.innerHTML = '<div class="empty-state">No public posts yet.</div>'; return; }
    for (const item of own) await renderPost(item.id, item.data(), container);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="empty-state">Could not load this member’s posts.</div>';
  }
}

export async function showSinglePost(postId, container) {
  container.innerHTML = '<div class="empty-state">Opening post...</div>';
  const snap = await getDoc(doc(db, "posts", postId));
  container.innerHTML = "";
  if (!snap.exists()) { container.innerHTML = '<div class="empty-state">This post is no longer available.</div>'; return; }
  const back = document.createElement("button"); back.className = "soft-btn"; back.textContent = "← Back to latest feed";
  back.addEventListener("click", () => loadPosts(true));
  container.appendChild(back);
  await renderPost(snap.id, snap.data(), container);
}

function makeAvatar(name, photo) {
  return photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "BG")}&background=eaf7ff&color=168bd2&bold=true`;
}
async function renderPost(id, post, container) {
  const card = document.createElement("article"); card.className = "post-card"; card.id = `post-${id}`;
  const authorBtn = document.createElement("button"); authorBtn.className = "post-author";
  const avatar = document.createElement("img"); avatar.src = makeAvatar(post.author, post.authorPhoto);
  const authorText = document.createElement("span");
  const author = document.createElement("strong"); author.textContent = post.author || "BanglaGram member";
  const meta = document.createElement("small"); meta.className = "post-meta";
  meta.textContent = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : "BanglaGram member";
  authorText.append(author, meta); authorBtn.append(avatar, authorText);
  authorBtn.addEventListener("click", () => window.dispatchEvent(new CustomEvent("bg:profile", { detail: post.uid })));
  card.appendChild(authorBtn);
  if (post.text) { const body = document.createElement("p"); body.className = "post-text"; body.textContent = post.text; card.appendChild(body); }
  const mediaUrl = post.mediaUrl || post.imageUrl || "";
  const mediaType = post.mediaType || (post.imageUrl ? "image" : "");
  if (mediaUrl && mediaType === "video") {
    const video = document.createElement("video"); video.className = "post-media post-video"; video.src = mediaUrl;
    video.controls = true; video.playsInline = true; video.preload = "metadata";
    video.addEventListener("dblclick", () => openMedia(mediaUrl, "video"));
    card.appendChild(video);
  } else if (mediaUrl) {
    const img = document.createElement("img"); img.className = "post-media"; img.src = mediaUrl; img.alt = "Post picture"; img.loading = "lazy";
    img.addEventListener("click", () => openMedia(mediaUrl, "image")); img.onerror = () => img.remove(); card.appendChild(img);
  }

  const actions = document.createElement("div"); actions.className = "actions";
  const likeBtn = document.createElement("button"); likeBtn.textContent = "♡ Like";
  const likeRef = doc(db, "posts", id, "likes", auth.currentUser.uid);
  const existingLike = await getDoc(likeRef);
  if (existingLike.exists()) { likeBtn.classList.add("liked"); likeBtn.textContent = "♥ Liked"; }
  const likesSnap = await getDocs(collection(db, "posts", id, "likes"));
  likeBtn.textContent = `${existingLike.exists() ? "♥ Liked" : "♡ Like"} (${likesSnap.size})`;
  likeBtn.addEventListener("click", async () => {
    likeBtn.disabled = true;
    try {
      const before = await getDoc(likeRef);
      if (before.exists()) { await deleteDoc(likeRef); likeBtn.classList.remove("liked"); }
      else {
        await setDoc(likeRef, { uid: auth.currentUser.uid, createdAt: serverTimestamp() });
        if (post.uid) await createNotification(post.uid, "like", `${auth.currentUser.displayName || "A member"} liked your post.`, { postId: id, targetUid: auth.currentUser.uid });
        likeBtn.classList.add("liked");
      }
      const now = await getDocs(collection(db, "posts", id, "likes"));
      likeBtn.textContent = `${(await getDoc(likeRef)).exists() ? "♥ Liked" : "♡ Like"} (${now.size})`;
    } catch (e) { alert(e.message); } finally { likeBtn.disabled = false; }
  });
  const commentBtn = document.createElement("button"); commentBtn.textContent = "💬 Comments";
  actions.append(likeBtn, commentBtn); card.appendChild(actions);

  const area = document.createElement("div"); area.className = "comment-area"; area.hidden = true;
  const input = document.createElement("input"); input.className = "comment-input"; input.placeholder = "Write a comment...";
  const send = document.createElement("button"); send.className = "soft-btn"; send.textContent = "Send comment";
  const list = document.createElement("div");
  async function refreshComments() {
    list.innerHTML = "";
    const snap = await getDocs(query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc"), limit(50)));
    snap.forEach(item => {
      const c = item.data(); const row = document.createElement("div"); row.className = "comment-row";
      const bubble = document.createElement("div"); bubble.className = "comment";
      const name = document.createElement("button"); name.className = "comment-user"; name.textContent = (c.author || "Member") + ": ";
      name.addEventListener("click", () => window.dispatchEvent(new CustomEvent("bg:profile", { detail: c.uid })));
      const text = document.createElement("span"); text.textContent = c.text || "";
      bubble.append(name, text); row.appendChild(bubble); list.appendChild(row);
    });
  }
  send.addEventListener("click", async () => {
    const value = input.value.trim(); if (!value) return;
    send.disabled = true;
    try {
      await addDoc(collection(db, "posts", id, "comments"), {
        uid: auth.currentUser.uid, author: auth.currentUser.displayName || "BanglaGram member",
        text: value, createdAt: serverTimestamp()
      });
      if (post.uid) await createNotification(post.uid, "comment", `${auth.currentUser.displayName || "A member"} commented on your post.`, { postId: id, targetUid: auth.currentUser.uid });
      input.value = ""; await refreshComments();
    } catch (e) { alert(e.message); } finally { send.disabled = false; }
  });
  commentBtn.addEventListener("click", async () => { area.hidden = !area.hidden; if (!area.hidden) await refreshComments(); });
  area.append(input, send, list); card.appendChild(area); container.appendChild(card);
}
function openMedia(url, type) {
  const box = document.getElementById("mediaLightbox");
  const content = document.getElementById("lightboxContent");
  content.innerHTML = "";
  const media = document.createElement(type === "video" ? "video" : "img");
  media.src = url;
  if (type === "video") { media.controls = true; media.autoplay = true; media.playsInline = true; }
  media.alt = "Expanded media";
  content.appendChild(media); box.hidden = false;
}
export function setPostTarget(targetId) { activeTarget = targetId; lastPost = null; }

