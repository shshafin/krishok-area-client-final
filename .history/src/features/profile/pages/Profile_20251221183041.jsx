/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  fetchMe,
  fetchUserPosts,
  likePost,
  commentOnPost,
  deleteComment,
  deletePost,
} from "@/api/authApi";
import { fetchMySeedPrices, deleteSeedPrice, createPost } from "@/api/authApi";

import ProfileOverview from "../components/ProfileOverview";
import ProfileSidebar from "../components/ProfileSidebar";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import PostComposerModalNew from "../components/PostComposerModalNew";
import FollowListModal from "../components/FollowListModal";
import AllPostsModal from "../components/AllPostsModal";
import { LiquedLoader } from "@/components/loaders";
import CreatePost from "@/components/layout/CreatePost";
import { baseApi } from "../../../api";

// --- CONFIG ---
const API_URL = baseApi || "http://localhost:5001";
const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?.id ?? user?._id ?? user?.userId ?? user?.username ?? null;
}

const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${API_URL}/${cleanPath}`;
};

export default function ProfilePage() {
  const { username } = useParams();

  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [mySeedPrices, setMySeedPrices] = useState([]);

  // Modals & Composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState("text");
  const [allPostsOpen, setAllPostsOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  // Active Post Interaction
  const [activePostId, setActivePostId] = useState(null);
  const [activePostMode, setActivePostMode] = useState("comments");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);

  const composerRef = useRef(null);

  // --- INTERACTION HANDLERS ---
  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setActivePostMode("comments");
    setSelectedIndex(0);
  }, []);

  const openPostComments = useCallback((postId, index = 0) => {
    console.log("CLICK DETECTED: Opening Comments for", postId);
    setActivePostMode("comments");
    setActivePostId(postId);
    setSelectedIndex(index);
  }, []);

  const openPostLikes = useCallback((postId) => {
    console.log("CLICK DETECTED: Opening Likes for", postId);
    setActivePostMode("likes");
    setActivePostId(postId);
  }, []);

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Me
        const meRes = await fetchMe();
        const me = meRes?.data ?? meRes;
        setCurrentUser(me);

        // 2. Target Profile ID
        let targetId = username ?? resolveUserId(me);
        if (!targetId) throw new Error("No user ID found");

        // 3. Posts
        const postRes = await fetchUserPosts(targetId);
        const rawPosts = Array.isArray(postRes)
          ? postRes
          : postRes?.posts || [];

        // 4. Data Normalization (Fixing Media & Name)
        const fixedPosts = rawPosts.map((post) => {
          // Fix Gallery
          const gallery = [];
          const vids = Array.isArray(post.videos)
            ? post.videos
            : post.video
            ? [post.video]
            : [];
          const imgs = Array.isArray(post.images)
            ? post.images
            : post.image
            ? [post.image]
            : [];

          vids.forEach((v) => {
            const src = typeof v === "object" ? v.url || v.src : v;
            if (src)
              gallery.push({ type: "video", src: ensureAbsoluteUrl(src) });
          });
          imgs.forEach((i) => {
            const src = typeof i === "object" ? i.url || i.src : i;
            if (src)
              gallery.push({ type: "image", src: ensureAbsoluteUrl(src) });
          });

          // Fix Name
          const u = post.user || {};
          const name =
            u.name && u.name.trim()
              ? u.name
              : u.fullName || u.username || "Unknown";

          return {
            ...post,
            id: post._id,
            mediaGallery: gallery,
            media: gallery[0] || null,
            author: {
              id: u._id || post.userId,
              name: name,
              avatar: u.profileImage
                ? ensureAbsoluteUrl(u.profileImage)
                : avatarFromSeed(u.username || "user"),
            },
            content: post.text || post.content || "",
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            liked:
              Array.isArray(post.likes) &&
              post.likes.some((l) => resolveUserId(l) === resolveUserId(me)),
            comments: (post.comments || []).map((c) => ({
              id: c._id,
              text: c.text,
              author: {
                id: resolveUserId(c.user),
                name: c.user?.name || c.user?.username || "User",
                avatar: c.user?.profileImage
                  ? ensureAbsoluteUrl(c.user.profileImage)
                  : avatarFromSeed("u"),
              },
              createdAt: c.createdAt,
            })),
          };
        });

        setProfile(me._id === targetId ? me : { ...me, _id: targetId }); // Simplified for safety
        setPosts(fixedPosts);
        setFollowers(me.followers || []);
        setFollowing(me.following || []);

        // Load Seeds
        if (targetId === resolveUserId(me)) {
          try {
            const seedRes = await fetchMySeedPrices();
            setMySeedPrices(seedRes?.data || []);
          } catch (e) {
            console.error(e);
          }
        }
      } catch (error) {
        console.error("Profile Load Error:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [username]);

  // --- ACTIONS ---
  const toggleLike = async (postId) => {
    console.log("CLICK DETECTED: Like Toggle", postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const willLike = !post.liked;

    // Optimistic Update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: willLike,
              likes: willLike ? p.likes + 1 : p.likes - 1,
            }
          : p
      )
    );

    try {
      await likePost(postId, willLike);
    } catch (err) {
      console.error(err);
      // Revert
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: !willLike,
                likes: !willLike ? p.likes + 1 : p.likes - 1,
              }
            : p
        )
      );
    }
  };

  const addComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const res = await commentOnPost(postId, text);
      const cData = res.post?.comments?.slice(-1)[0] || res.comment || res;

      const newC = {
        id: cData._id,
        text: cData.text,
        createdAt: cData.createdAt,
        author: {
          id: currentUser._id,
          name: currentUser.name || "You",
          avatar: currentUser.profileImage
            ? ensureAbsoluteUrl(currentUser.profileImage)
            : avatarFromSeed("you"),
        },
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newC] } : p
        )
      );
      toast.success("Comment added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to comment");
    }
  };

  // Helper variables
  const currentUserId = resolveUserId(currentUser);
  const isOwner = !username || (currentUserId && username === currentUserId); // Simplified logic
  const stats = {
    posts: posts.length,
    followers: followers.length,
    following: following.length,
  };

  const viewerIdentity = useMemo(
    () => ({
      name: currentUser?.name,
      username: currentUser?.username,
      avatar: currentUser?.profileImage
        ? ensureAbsoluteUrl(currentUser.profileImage)
        : null,
    }),
    [currentUser]
  );

  // --- RENDER ---
  if (loading)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <LiquedLoader />
      </div>
    );

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: "50px" }}>
      {/* 1. Header Section */}
      <ProfileOverview
        profile={profile}
        stats={stats}
        isOwner={isOwner}
        isFollowing={isFollowingProfile}
        showPrimaryAction={!isOwner}
        onPrimaryAction={() => toast.success("Edit Profile")}
        onOpenAllPosts={() => setAllPostsOpen(true)}
        onOpenFollowers={() => setFollowersOpen(true)}
        onOpenFollowing={() => setFollowingOpen(true)}
      />

      {/* 2. Main Layout - RAW FLEXBOX */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "24px",
          maxWidth: "1200px",
          margin: "24px auto",
          padding: "0 20px",
          position: "relative", // Layout context
        }}>
        {/* LEFT: Sidebar (Fixed Width) */}
        <aside
          style={{
            width: "320px",
            flexShrink: 0,
            position: "relative",
            zIndex: 5,
          }}>
          <ProfileSidebar
            profile={profile}
            isOwner={isOwner}
            compactSeedDisplay={!isOwner}
            seeds={mySeedPrices}
            hasMoreSeeds={false}
            onDeleteSeed={() => {}}
            onOpenComposer={(mode) => {
              setComposerMode(mode);
              setComposerOpen(true);
            }}
            onLoadMoreSeeds={() => {}}
          />
        </aside>

        {/* RIGHT: Feed (Takes Remaining Space) */}
        <main
          style={{
            flex: 1,
            minWidth: 0, // Prevent flex overflow
            position: "relative",
            zIndex: 10, // Higher than sidebar to ensure clicks
          }}>
          {isOwner && (
            <div style={{ marginBottom: "20px" }}>
              <CreatePost
                user={currentUser?.name || "You"}
                profile={
                  currentUser?.profileImage
                    ? ensureAbsoluteUrl(currentUser.profileImage)
                    : null
                }
                onTextClick={() => {
                  setComposerMode("text");
                  setComposerOpen(true);
                }}
                onPhotoVideoClick={() => {
                  setComposerMode("media");
                  setComposerOpen(true);
                  setTimeout(
                    () => composerRef.current?.triggerFileInput(),
                    100
                  );
                }}
              />
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOwner={isOwner}
                onLike={toggleLike}
                onOpenComments={openPostComments}
                onOpenLikes={openPostLikes}
                onDelete={() => {}}
                onAddComment={addComment}
                onOpenPost={openPostComments}
              />
            ))}
            {posts.length === 0 && (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No posts yet.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- MODALS --- */}
      <AllPostsModal
        open={allPostsOpen}
        onClose={() => setAllPostsOpen(false)}
        posts={posts}
        onSelect={(post) => {
          openPostComments(post.id);
          setAllPostsOpen(false);
        }}
      />

      <FollowListModal
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        title="Followers"
        users={followers}
      />

      <FollowListModal
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title="Following"
        users={following}
      />

      <PostModal
        open={Boolean(activePostId)}
        post={posts.find((p) => p.id === activePostId)}
        mode={activePostMode}
        initialSlideIndex={selectedIndex}
        onClose={closeActivePost}
        onToggleLike={toggleLike}
        onAddComment={addComment}
        onDeleteComment={removeComment}
      />

      <PostComposerModalNew
        ref={composerRef}
        open={composerOpen}
        mode={composerMode}
        onClose={() => setComposerOpen(false)}
        onSubmit={() => {}}
        viewer={viewerIdentity}
      />
    </div>
  );
}
