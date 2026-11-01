import { initAuth } from "./auth.js";
import { createPost, loadPosts } from "./posts.js";
import { getMyProfile } from "./profile.js";

const $ = (id) => document.getElementById(id);

async function handleLogin(user) {
  $("welcomeName").textContent =
    `Welcome, ${user.displayName || "BanglaGram User"}!`;

  $("feed").innerHTML = "<p>Loading posts...</p>";

  try {
    const profile = await getMyProfile();

    $("welcomeName").textContent =
      `Welcome, ${profile.name || user.displayName || "User"}!`;
  } catch (error) {
    console.error("Profile:", error);
  }

  await loadPosts(true);
}

function handleLogout() {
  $("feed").innerHTML = "";
  $("postText").value = "";
  $("imageUrl").value = "";
}

initAuth(handleLogin, handleLogout);

$("postBtn")?.addEventListener("click", async () => {
  const text = $("postText").value;
  const imageUrl = $("imageUrl").value;

  try {
    $("postBtn").disabled = true;

    await createPost(text, imageUrl);

    $("postText").value = "";
    $("imageUrl").value = "";

    await loadPosts(true);

    alert("Your post has been published!");
  } catch (error) {
    alert(error.message);
  } finally {
    $("postBtn").disabled = false;
  }
});

$("loadMoreBtn")?.addEventListener("click", async () => {
  await loadPosts(false);
});
