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

import "@/features/profile/styles/ProfilePage.css";
import { baseApi } from "../../../api";

// --- CONFIG ---
const API_URL = baseApi || "http://localhost:5001";
const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?.id ?? user?._id ?? user?.userId ?? user?.username ?? null;
}

const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  const src = typeof url === "object" ? url.url || url.src : url;
  if (src.startsWith("http") || src.startsWith("blob:")) return src;
  const cleanPath = src.startsWith("/") ? src.slice(1) : src;
  return `${API_URL}/${cleanPath}`;
};

export default function ProfilePage() {
  const { username } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [mySeedPrices, setMySeedPrices] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState("text");
  const [allPostsOpen, setAllPostsOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const [activePostId, setActivePostId] = useState(null);
  const [activePostMode, setActivePostMode] = useState("comments");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);

  const composerRef = useRef(null);

  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setActivePostMode("comments");
    setSelectedIndex(0);
  }, []);

  const openPostComments = useCallback((postId, index = 0) => {
    console.log("TRIGGERED: Open Comments for", postId);
    setActivePostMode("comments");
    setActivePostId(postId);
    setSelectedIndex(index);
  }, []);

  const openPostLikes = useCallback((postId) => {
    setActivePostMode("likes");
    setActivePostId(postId);
  }, []);

  useEffect(() => {
    const loadCurrentUserAndProfile = async () => {
      try {
        setLoading(true);
        const meResponse = await fetchMe();
        const meData = meResponse?.data ?? meResponse;
        setCurrentUser(meData);

        let profileUserId = username ?? resolveUserId(meData);
        if (!profileUserId) throw new Error("Profile user not found");

        const postsResponse = await fetchUserPosts(profileUserId);
        const rawPostsArray = Array.isArray(postsResponse)
          ? postsResponse
          : postsResponse?.posts || [];

        let loadedProfile =
          meData?._id === profileUserId
            ? meData
            : { ...meData, _id: profileUserId };
        if (postsResponse?.user) loadedProfile = postsResponse.user;

        const normalizedPosts = rawPostsArray.map((post) => {
          let gallery = [];
          const rawVideos = Array.isArray(post.videos) ? post.videos : [];
          if (post.video) rawVideos.push(post.video);
          rawVideos.forEach((vid) => {
            const src = ensureAbsoluteUrl(vid);
            if (src) gallery.push({ type: "video", src });
          });
          const rawImages = Array.isArray(post.images) ? post.images : [];
          if (post.image) rawImages.push(post.image);
          if (post.mediaUrl) rawImages.push(post.mediaUrl);
          rawImages.forEach((img) => {
            const src = ensureAbsoluteUrl(img);
            if (src) gallery.push({ type: "image", src });
          });

          // Name Fallback Logic
          let postUser = post.user || post.author || {};
          if (typeof postUser === "string") {
            if (
              loadedProfile._id === postUser ||
              loadedProfile.id === postUser
            ) {
              postUser = loadedProfile;
            } else {
              postUser = { _id: postUser, name: "Unknown", username: "user" };
            }
          }
          const realName =
            postUser.name && postUser.name.trim() !== ""
              ? postUser.name
              : postUser.fullName || postUser.username || "Unknown";

          return {
            ...post,
            id: post._id,
            mediaGallery: gallery,
            media: gallery[0] || null,
            author: {
              id: postUser._id || post.userId,
              name: realName,
              avatar: postUser.profileImage
                ? ensureAbsoluteUrl(postUser.profileImage)
                : avatarFromSeed(postUser.username || "user"),
            },
            content: post.text || post.content || "",
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            liked:
              Array.isArray(post.likes) &&
              post.likes.some(
                (l) => resolveUserId(l) === resolveUserId(meData)
              ),
            comments: (post.comments || []).map((c) => ({
              id: c._id,
              text: c.text,
              author: {
                id: resolveUserId(c.user),
                name: c.user?.name || c.user?.username || "Unknown",
                avatar: c.user?.profileImage
                  ? ensureAbsoluteUrl(c.user?.profileImage)
                  : avatarFromSeed("user"),
              },
              createdAt: c.createdAt,
            })),
          };
        });

        setProfile(loadedProfile);
        setPosts(normalizedPosts);
        setFollowers(meData.followers ?? []);
        setFollowing(meData.following ?? []);

        if (profileUserId === resolveUserId(meData)) {
          const seedsResponse = await fetchMySeedPrices();
          setMySeedPrices(seedsResponse?.data ?? seedsResponse ?? []);
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Profile load failed");
      } finally {
        setLoading(false);
      }
    };
    loadCurrentUserAndProfile();
  }, [username]);

  const toggleLike = async (postId) => {
    console.log("TRIGGERED: Like for", postId); // CONFIRM THIS SHOWS
    if (!postId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const willLike = !post.liked;
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
    } catch (error) {
      console.error("API Error", error);
      toast.error("Like failed");
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
    console.log("TRIGGERED: Add Comment", postId, text);
    if (!text.trim()) return;
    try {
      const response = await commentOnPost(postId, text);
      // Simplified Logic for brevity
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const deletePostHandler = async (postId) => {
    deletePost(postId);
  };
  const deleteSeedHandler = async (id) => {
    deleteSeedPrice(id);
  };
  const removeComment = async (pid, cid) => {
    deleteComment(pid, cid);
  };
  const submitComposer = async (payload) => {
    setComposerOpen(false);
  };

  if (loading || !profile) return <LiquedLoader />;

  return (
    <div
      className="profile-page"
      style={{ position: "relative" }}>
      <ProfileOverview
        profile={profile}
        stats={{
          posts: posts.length,
          followers: followers.length,
          following: following.length,
        }}
        isOwner={isOwner}
        isFollowing={isFollowingProfile}
        showPrimaryAction={!isOwner}
        onPrimaryAction={() => {}}
        onOpenAllPosts={() => setAllPostsOpen(true)}
        onOpenFollowers={() => setFollowersOpen(true)}
        onOpenFollowing={() => setFollowingOpen(true)}
      />

      {/* --- FORCE LAYOUT FIX: Bypass broken CSS file --- */}
      <div
        className="profile-two-column"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: "20px",
          position: "relative",
          padding: "20px",
        }}>
        {/* Sidebar Container: Ensure it doesn't stretch to cover feed */}
        <div
          style={{
            width: "300px",
            flexShrink: 0,
            position: "sticky",
            top: "20px",
            zIndex: 5,
          }}>
          <ProfileSidebar
            profile={profile}
            isOwner={isOwner}
            compactSeedDisplay={!isOwner}
            seeds={mySeedPrices}
            hasMoreSeeds={false}
            onDeleteSeed={deleteSeedHandler}
            onOpenComposer={(mode) => {
              setComposerMode(mode);
              setComposerOpen(true);
            }}
            onLoadMoreSeeds={() => {}}
          />
        </div>

        {/* Feed Container: Ensure it takes remaining space and sits on top */}
        <section
          className="post-feed"
          style={{
            flexGrow: 1,
            minWidth: 0,
            position: "relative",
            zIndex: 10, // Higher zIndex to ensure clickability
          }}>
          {isOwner && (
            <CreatePost
              user={profile.name || "You"}
              profile={profile.profileImage}
              onTextClick={() => {
                setComposerMode("text");
                setComposerOpen(true);
              }}
              onPhotoVideoClick={() => {
                setComposerMode("media");
                setComposerOpen(true);
              }}
            />
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isOwner={isOwner}
              onLike={toggleLike}
              onOpenComments={openPostComments}
              onOpenLikes={openPostLikes}
              onDelete={deletePostHandler}
              onAddComment={addComment}
              onOpenPost={openPostComments}
            />
          ))}
        </section>
      </div>

      {/* Modals */}
      <AllPostsModal
        open={allPostsOpen}
        onClose={() => setAllPostsOpen(false)}
        posts={posts}
        onSelect={(p) => openPostComments(p.id)}
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
        onSubmit={submitComposer}
        viewer={{ name: "You", username: "you", avatar: "" }}
      />
    </div>
  );
}
