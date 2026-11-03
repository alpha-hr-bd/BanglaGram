import { auth, db } from "./firebase.js";
import { initAuth } from "./auth.js";
import { createPost, loadPosts, uploadMedia, loadUserPosts, showSinglePost, setPostTarget } from "./posts.js";
import { getMyProfile, getProfile, updateMyProfile } from "./profile.js";
import { getAllUsers, searchUsers, followUser, unfollowUser, isFollowing, getFollowers, getFollowing } from "./social.js";
import { getNotifications, markNotificationRead } from "./notifications.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
let myProfile = null, viewedUid = null, previousView = "home", selectedFile = null, composerKind = "post";
let toastTimer, searchTimer;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function avatar(person) {
  return person?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(person?.name || "BG")}&background=eaf7ff&color=168bd2&bold=true`;
}
function setAvatar(el, person) {
  el.src = avatar(person); el.onerror = () => { el.onerror = null; el.src = avatar({name:"BG"}); };
}
function showView(view) {
  ["home","explore","profile","connections","notifications"].forEach(v => $(`${v}View`).hidden = v !== view);
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  if (view === "explore") loadExplore($("userSearch").value);
  if (view === "profile" && auth.currentUser) openProfile(auth.currentUser.uid, false);
  if (view === "notifications") loadNotices();
}
async function loadExplore(term = "") {
  const box = $("peopleResults"); box.innerHTML = '<div class="empty-state">Loading members...</div>';
  try {
    const people = term.trim() ? await searchUsers(term) : await getAllUsers();
    const visible = people.filter(p => p.id !== auth.currentUser.uid);
    box.innerHTML = "";
    if (!visible.length) { box.innerHTML = '<div class="empty-state">No members found. Create another account or try a different search.</div>'; return; }
    for (const p of visible) box.appendChild(await personCard(p));
  } catch (e) {
    console.error(e); box.innerHTML = '<div class="empty-state">Could not load members. Check Firestore Rules and the users collection.</div>';
  }
}
async function personCard(person) {
  const card = document.createElement("article"); card.className = "person-card";
  const open = document.createElement("button"); open.className = "person-open";
  const img = document.createElement("img"); setAvatar(img, person);
  const name = document.createElement("h3"); name.textContent = person.name || "BanglaGram member";
  open.append(img, name); open.addEventListener("click", () => openProfile(person.id));
  const bio = document.createElement("p"); bio.textContent = person.bio || "BanglaGram member";
  const btn = document.createElement("button");
  const following = await isFollowing(person.id);
  btn.className = following ? "soft-btn" : "primary-btn"; btn.textContent = following ? "Following ✓" : "＋ Follow";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      if (await isFollowing(person.id)) { await unfollowUser(person.id); btn.textContent = "＋ Follow"; btn.className = "primary-btn"; toast("Unfollowed."); }
      else { await followUser(person.id); btn.textContent = "Following ✓"; btn.className = "soft-btn"; toast("You are now following " + (person.name || "this member")); }
      if (viewedUid === auth.currentUser.uid) await refreshProfileCounts();
    } catch (e) { toast(e.message); } finally { btn.disabled = false; }
  });
  card.append(open, bio, btn); return card;
}
async function openProfile(uid, remember = true) {
  if (!uid) return;
  try {
    if (remember && !$("profileView").hidden) previousView = "profile";
    else if (remember) previousView = document.querySelector(".view-section:not([hidden])")?.id.replace("View","") || "home";
    const p = await getProfile(uid); viewedUid = uid;
    ["home","explore","profile","connections","notifications"].forEach(v => $(`${v}View`).hidden = v !== "profile");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "profile" && uid === auth.currentUser.uid));
    $("profileName").textContent = p.name || "BanglaGram member";
    $("profileHandle").textContent = "@" + (p.name || "member").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,24);
    $("profileBio").textContent = p.bio || "No bio added yet.";
    setAvatar($("profileAvatar"), p);
    const mine = uid === auth.currentUser.uid;
    $("profileEdit").hidden = !mine;
    $("profileFollowBtn").hidden = mine;
    $("profileFollowBtn").textContent = await isFollowing(uid) ? "Following ✓" : "＋ Follow";
    $("profileFollowBtn").className = (await isFollowing(uid)) ? "soft-btn follow-profile-btn" : "primary-btn follow-profile-btn";
    $("editName").value = p.name || ""; $("editBio").value = p.bio || ""; $("editPhoto").value = p.photoURL || "";
    $("profilePostsTitle").textContent = mine ? "Your posts" : `${p.name || "Member"}'s posts`;
    await refreshProfileCounts();
    await loadUserPosts(uid, $("profilePosts"));
  } catch (e) { console.error(e); toast(e.message || "Could not open profile."); }
}
async function refreshProfileCounts() {
  if (!viewedUid) return;
  const [followers, following] = await Promise.all([getFollowers(viewedUid), getFollowing(viewedUid)]);
  $("followersCount").textContent = followers.length; $("followingCount").textContent = following.length;
}
async function showConnections(type) {
  if (!viewedUid) return;
  previousView = "profile";
  $("profileView").hidden = true; $("connectionsView").hidden = false;
  $("connectionsTitle").textContent = type === "followers" ? "Followers" : "Following";
  const box = $("connectionsList"); box.innerHTML = '<div class="empty-state">Loading...</div>';
  try {
    const rows = type === "followers" ? await getFollowers(viewedUid) : await getFollowing(viewedUid);
    const people = [];
    for (const row of rows) {
      const uid = type === "followers" ? row.followerUid : row.followingUid;
      const snap = await getDocs(query(collection(db,"users"), where("uid","==",uid), limit(1)));
      if (!snap.empty) people.push({id:snap.docs[0].id,...snap.docs[0].data()});
    }
    box.innerHTML = "";
    if (!people.length) { box.innerHTML = '<div class="empty-state">No members here yet.</div>'; return; }
    for (const p of people) box.appendChild(await personCard(p));
  } catch (e) { box.innerHTML = '<div class="empty-state">Could not load this list.</div>'; console.error(e); }
}
async function loadNotices() {
  const box = $("notificationList"); box.innerHTML = '<div class="empty-state">Loading notifications...</div>';
  try {
    const items = await getNotifications(); box.innerHTML = "";
    const unread = items.filter(n => !n.read).length;
    $("notificationBadge").hidden = unread === 0; $("notificationBadge").textContent = unread > 9 ? "9+" : unread;
    if (!items.length) { box.innerHTML = '<div class="empty-state">No notifications yet. Likes, comments and follows will appear here.</div>'; return; }
    items.forEach(n => {
      const row = document.createElement("div"); row.className = "notification-item" + (!n.read ? " unread" : "");
      const icon = document.createElement("span"); icon.className = "notification-icon"; icon.textContent = n.type === "like" ? "♥" : n.type === "comment" ? "💬" : "＋";
      const wrap = document.createElement("span"); wrap.style.flex = "1";
      const msg = document.createElement("p"); msg.textContent = n.message || "You have a new update.";
      const state = document.createElement("small"); state.textContent = n.read ? "Seen" : "New"; wrap.append(msg,state); row.append(icon,wrap);
      const senderBtn = document.createElement("button"); senderBtn.className = "soft-btn"; senderBtn.textContent = "Profile";
      senderBtn.addEventListener("click", async () => { try { if (!n.read) await markNotificationRead(n.id); await openProfile(n.targetUid || n.senderUid); } catch(e) { toast(e.message); } });
      row.appendChild(senderBtn);
      if (n.postId) {
        const postBtn = document.createElement("button"); postBtn.className = "primary-btn"; postBtn.textContent = "View post";
        postBtn.addEventListener("click", async () => {
          try { if (!n.read) await markNotificationRead(n.id); showView("home"); await showSinglePost(n.postId, $("feed")); }
          catch(e) { toast(e.message); }
        });
        row.appendChild(postBtn);
      }
      box.appendChild(row);
    });
    $("notificationBadge").hidden = unread === 0; $("notificationBadge").textContent = unread > 9 ? "9+" : unread;
  } catch(e) { console.error(e); box.innerHTML = '<div class="empty-state">Could not load notifications. Check Firestore index/rules.</div>'; }
}
function previewSelected() {
  const box = $("mediaPreview"); box.innerHTML = ""; box.hidden = !selectedFile;
  if (!selectedFile) return;
  const url = URL.createObjectURL(selectedFile);
  const media = document.createElement(selectedFile.type.startsWith("video/") ? "video" : "img");
  media.src = url; if (media.tagName === "VIDEO") { media.controls = true; media.muted = true; }
  box.appendChild(media); $("uploadLabel").textContent = selectedFile.name;
}
initAuth(async user => {
  try {
    myProfile = await getMyProfile();
    $("welcomeName").textContent = "Welcome back, " + (myProfile.name || "friend") + "!";
    $("sideName").textContent = myProfile.name || "BanglaGram member";
    $("sideHandle").textContent = "@" + (myProfile.name || "member").toLowerCase().replace(/[^a-z0-9]+/g,"");
    setAvatar($("sideAvatar"), myProfile);
    await loadPosts(true);
    await loadNotices();
  } catch(e) { console.error(e); }
}, () => { $("feed").innerHTML = ""; });

document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
$("brandHome").addEventListener("click", e => { e.preventDefault(); showView("home"); });
$("sidebarProfile").addEventListener("click", () => openProfile(auth.currentUser.uid));
window.addEventListener("bg:profile", e => openProfile(e.detail));
$("userSearch").addEventListener("input", e => { clearTimeout(searchTimer); const term=e.target.value; searchTimer=setTimeout(()=>loadExplore(term),250); });
$("backFromProfile").addEventListener("click", () => showView(previousView === "profile" ? "home" : previousView));
$("backFromConnections").addEventListener("click", () => openProfile(viewedUid, false));
$("followersBtn").addEventListener("click", () => showConnections("followers"));
$("followingBtn").addEventListener("click", () => showConnections("following"));
$("profileFollowBtn").addEventListener("click", async () => {
  const btn=$("profileFollowBtn"); btn.disabled=true;
  try {
    if(await isFollowing(viewedUid)){await unfollowUser(viewedUid);btn.textContent="＋ Follow";btn.className="primary-btn follow-profile-btn";}
    else{await followUser(viewedUid);btn.textContent="Following ✓";btn.className="soft-btn follow-profile-btn";}
    await refreshProfileCounts();
  }catch(e){toast(e.message);}finally{btn.disabled=false;}
});
$("saveProfileBtn").addEventListener("click", async () => {
  try { await updateMyProfile($("editName").value,$("editBio").value,$("editPhoto").value); toast("Profile updated!"); myProfile=await getMyProfile(); $("sideName").textContent=myProfile.name; setAvatar($("sideAvatar"),myProfile); await openProfile(auth.currentUser.uid,false); }
  catch(e){$("profileMessage").textContent=e.message;}
});
document.querySelectorAll(".composer-tab").forEach(btn=>btn.addEventListener("click",()=>{
  composerKind=btn.dataset.kind;document.querySelectorAll(".composer-tab").forEach(b=>b.classList.toggle("active",b===btn));
  $("mediaFile").accept=composerKind==="picture"?"image/*":composerKind==="video"?"video/*":"image/*,video/*";
  $("uploadLabel").textContent=composerKind==="post"?"Choose a picture or video":composerKind==="picture"?"Choose a picture":"Choose a video";
}));
$("mediaFile").addEventListener("change",e=>{
  selectedFile=e.target.files?.[0]||null;
  if(selectedFile && composerKind==="picture" && !selectedFile.type.startsWith("image/")){toast("Please select an image.");selectedFile=null;e.target.value="";}
  if(selectedFile && composerKind==="video" && !selectedFile.type.startsWith("video/")){toast("Please select a video.");selectedFile=null;e.target.value="";}
  previewSelected();
});
$("postBtn").addEventListener("click",async()=>{
  const btn=$("postBtn");btn.disabled=true;
  try{
    let media={mediaUrl:"",mediaType:""};
    if(selectedFile){$("uploadStatus").textContent="Uploading: 0%";media=await uploadMedia(selectedFile,p=>$("uploadStatus").textContent=`Uploading: ${p}%`);}
    await createPost($("postText").value,media.mediaUrl,media.mediaType);
    $("postText").value="";$("mediaFile").value="";selectedFile=null;previewSelected();$("uploadStatus").textContent="";
    showView("home");setPostTarget("feed");await loadPosts(true);toast("Your post is published!");
  }catch(e){console.error(e);toast(e.message);}
  finally{btn.disabled=false;}
});
$("loadMoreBtn").addEventListener("click",()=>loadPosts(false));
$("closeLightbox").addEventListener("click",()=>{$("mediaLightbox").hidden=true;$("lightboxContent").innerHTML="";});
$("mediaLightbox").addEventListener("click",e=>{if(e.target===$("mediaLightbox")){$("mediaLightbox").hidden=true;$("lightboxContent").innerHTML="";}});

