import { auth } from "./firebase.js";
import { initAuth } from "./auth.js";
import { createPost, loadPosts } from "./posts.js";
import { getMyProfile, updateMyProfile } from "./profile.js";
import {
  searchUsers, followUser, unfollowUser, isFollowing,
  getFollowers, getFollowing
} from "./social.js";
import { getNotifications } from "./notifications.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

const $ = (id) => document.getElementById(id);
let currentProfile = null;
let toastTimer = null;

function toast(message) {
  const box = $("toast");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("show"), 2600);
}

function avatarUrl(person) {
  if (person?.photoURL) return person.photoURL;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(person?.name || "BG")}&background=eaf7ff&color=168bd2&bold=true`;
}

function safeImage(img, person) {
  img.src = avatarUrl(person);
  img.onerror = () => {
    img.onerror = null;
    img.src = "https://ui-avatars.com/api/?name=BG&background=eaf7ff&color=168bd2";
  };
}

function showView(view) {
  ["home", "explore", "profile", "notifications"].forEach((name) => {
    $(`${name}View`).hidden = name !== view;
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "profile") loadMyProfile();
  if (view === "notifications") loadMyNotifications();
}

async function loadMyProfile() {
  try {
    const profile = await getMyProfile();
    currentProfile = profile;
    $("profileName").textContent = profile.name || "BanglaGram User";
    $("profileBio").textContent = profile.bio || "Add a short bio about yourself.";
    $("editName").value = profile.name || "";
    $("editBio").value = profile.bio || "";
    $("editPhoto").value = profile.photoURL || "";
    safeImage($("profileAvatar"), profile);
    safeImage($("sideAvatar"), profile);
    $("sideName").textContent = profile.name || "BanglaGram User";
    $("sideHandle").textContent = "@" + (profile.name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const [followers, following] = await Promise.all([
      getFollowers(auth.currentUser.uid), getFollowing(auth.currentUser.uid)
    ]);
    $("followersCount").textContent = followers.length;
    $("followingCount").textContent = following.length;
    await loadMyPosts();
  } catch (error) {
    console.error(error);
    $("profileMessage").textContent = error.message;
  }
}

async function loadMyPosts() {
  const target = $("myPosts");
  target.innerHTML = '<div class="empty-state">Loading your posts...</div>';
  try {
    const q = query(collection(db, "posts"), where("uid", "==", auth.currentUser.uid), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    target.innerHTML = "";
    if (snap.empty) {
      target.innerHTML = '<div class="empty-state">You have not shared a post yet.</div>';
      return;
    }
    snap.forEach((item) => {
      const data = item.data();
      const card = document.createElement("article");
      card.className = "post-card";
      const heading = document.createElement("h3");
      heading.textContent = data.author || currentProfile?.name || "You";
      const body = document.createElement("p");
      body.textContent = data.text || "";
      card.append(heading, body);
      if (data.imageUrl) {
        const image = document.createElement("img");
        image.className = "post-image";
        image.src = data.imageUrl;
        image.alt = "Post image";
        image.loading = "lazy";
        image.onerror = () => image.remove();
        card.appendChild(image);
      }
      target.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    target.innerHTML = '<div class="empty-state">Could not load your posts. Check Firestore indexes if requested.</div>';
  }
}

async function runUserSearch(term) {
  const result = $("peopleResults");
  if (!term.trim()) {
    result.innerHTML = '<div class="empty-state">Start typing a name to discover people.</div>';
    return;
  }
  result.innerHTML = '<div class="empty-state">Searching people...</div>';
  try {
    const users = await searchUsers(term);
    const filtered = users.filter((person) => person.id !== auth.currentUser.uid);
    result.innerHTML = "";
    if (!filtered.length) {
      result.innerHTML = '<div class="empty-state">No members found. Try another name.</div>';
      return;
    }
    for (const person of filtered) {
      const following = await isFollowing(person.id);
      const card = document.createElement("article");
      card.className = "person-card";
      const image = document.createElement("img");
      safeImage(image, person);
      const name = document.createElement("h3");
      name.textContent = person.name || "BanglaGram User";
      const bio = document.createElement("p");
      bio.textContent = person.bio || "BanglaGram member";
      const button = document.createElement("button");
      button.className = following ? "soft-btn" : "primary-btn";
      button.textContent = following ? "Following ✓" : "＋ Follow";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          if (await isFollowing(person.id)) {
            await unfollowUser(person.id);
            button.textContent = "＋ Follow";
            button.className = "primary-btn";
            toast("You unfollowed " + (person.name || "this member"));
          } else {
            await followUser(person.id);
            button.textContent = "Following ✓";
            button.className = "soft-btn";
            toast("You are now following " + (person.name || "this member"));
          }
        } catch (error) {
          toast(error.message);
        } finally {
          button.disabled = false;
        }
      });
      card.append(image, name, bio, button);
      result.appendChild(card);
    }
  } catch (error) {
    console.error(error);
    result.innerHTML = '<div class="empty-state">Search failed. Please try again.</div>';
  }
}

async function showConnections(type) {
  try {
    const rows = type === "followers"
      ? await getFollowers(auth.currentUser.uid)
      : await getFollowing(auth.currentUser.uid);
    const names = [];
    for (const row of rows) {
      const uid = type === "followers" ? row.followerUid : row.followingUid;
      const snap = await getDocs(query(collection(db, "users"), where("uid", "==", uid), limit(1)));
      if (!snap.empty) names.push(snap.docs[0].data().name || "BanglaGram User");
    }
    alert((type === "followers" ? "Followers" : "Following") + " (" + names.length + ")\n\n" + (names.join("\n") || "No members yet."));
  } catch (error) {
    toast(error.message);
  }
}

async function loadMyNotifications() {
  const list = $("notificationList");
  list.innerHTML = '<div class="empty-state">Loading notifications...</div>';
  try {
    const notifications = await getNotifications();
    list.innerHTML = "";
    if (!notifications.length) {
      list.innerHTML = '<div class="empty-state">No notifications yet. Follow people and share posts to get started.</div>';
      return;
    }
    notifications.forEach((item) => {
      const row = document.createElement("div");
      row.className = "notification-item";
      const icon = document.createElement("span");
      icon.className = "notification-icon";
      icon.textContent = item.type === "follow" ? "＋" : "♡";
      const text = document.createElement("p");
      text.textContent = item.message || "You have a new update.";
      const time = document.createElement("small");
      time.textContent = item.read ? "Seen" : "New";
      const wrap = document.createElement("div");
      wrap.append(text, time);
      row.append(icon, wrap);
      list.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="empty-state">Could not load notifications.</div>';
  }
}

initAuth(async (user) => {
  $("welcomeName").textContent = "Welcome back, " + (user.displayName || "friend") + "!";
  try {
    currentProfile = await getMyProfile();
    $("welcomeName").textContent = "Welcome back, " + (currentProfile.name || user.displayName || "friend") + "!";
    safeImage($("sideAvatar"), currentProfile);
    $("sideName").textContent = currentProfile.name || "BanglaGram User";
  } catch (error) {
    console.warn("Profile not ready:", error);
  }
  await loadPosts(true);
}, () => {
  currentProfile = null;
  $("feed").innerHTML = "";
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.go));
});

let searchDelay;
$("userSearch")?.addEventListener("input", (event) => {
  clearTimeout(searchDelay);
  const value = event.target.value;
  searchDelay = setTimeout(() => runUserSearch(value), 350);
});

$("postBtn")?.addEventListener("click", async () => {
  const button = $("postBtn");
  try {
    button.disabled = true;
    await createPost($("postText").value, $("imageUrl").value);
    $("postText").value = "";
    $("imageUrl").value = "";
    await loadPosts(true);
    toast("Your post is live!");
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});

$("loadMoreBtn")?.addEventListener("click", () => loadPosts(false));
$("saveProfileBtn")?.addEventListener("click", async () => {
  const button = $("saveProfileBtn");
  try {
    button.disabled = true;
    await updateMyProfile($("editName").value, $("editBio").value, $("editPhoto").value);
    $("profileMessage").textContent = "Profile updated successfully!";
    toast("Profile saved!");
    await loadMyProfile();
  } catch (error) {
    $("profileMessage").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("followersBtn")?.addEventListener("click", () => showConnections("followers"));
$("followingBtn")?.addEventListener("click", () => showConnections("following"));

