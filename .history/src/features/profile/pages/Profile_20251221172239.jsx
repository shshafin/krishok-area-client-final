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

// Fallback if baseApi is undefined
const API_URL = baseApi || "http://localhost:5001";

const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?.id ?? user?._id ?? user?.userId ?? user?.username ?? null;
}

// Helper to ensure URLs are absolute
const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function ProfilePage() {
  const { username } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);
  const [mySeedPrices, setMySeedPrices] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState("text");
  const [allPostsOpen, setAllPostsOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const [activePostId, setActivePostId] = useState(null);
  const [activePostMode, setActivePostMode] = useState("comments");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const composerRef = useRef(null);

  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setActivePostMode("comments");
    setSelectedIndex(0);
  }, []);

  const openPostComments = useCallback((postId, index = 0) => {
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

        // Ensure we have an array
        const rawPostsArray = Array.isArray(postsResponse)
          ? postsResponse
          : postsResponse?.posts || [];

        const normalizedPosts = rawPostsArray.map((post) => {
          // --- FIX 1: Explicitly Build Gallery ---
          const gallery = [];

          // 1. Process Videos
          const rawVideos = Array.isArray(post.videos) ? post.videos : [];
          if (post.video) rawVideos.push(post.video);
          if (post.media?.video) rawVideos.push(post.media.video);

          rawVideos.forEach((vid) => {
            const srcRaw =
              typeof vid === "object" ? vid.url || vid.src || vid.path : vid;
            const src = ensureAbsoluteUrl(srcRaw);
            if (src) gallery.push({ type: "video", src });
          });

          // 2. Process Images
          const rawImages = Array.isArray(post.images) ? post.images : [];
          if (post.image) rawImages.push(post.image);
          if (post.mediaUrl) rawImages.push(post.mediaUrl);
          if (post.coverPhoto) rawImages.push(post.coverPhoto);
          if (post.media?.images) rawImages.push(...post.media.images);

          rawImages.forEach((img) => {
            const srcRaw =
              typeof img === "object" ? img.url || img.src || img.path : img;
            const src = ensureAbsoluteUrl(srcRaw);
            if (src) gallery.push({ type: "image", src });
          });

          // --- FIX 2: Strict Name Selection ---
          // Access the user object directly from the post
          const postUser = post.user || {};
          // Check for 'name' specifically and ensure it's not empty
          const realName =
            postUser.name && postUser.name.trim().length > 0
              ? postUser.name
              : postUser.fullName || postUser.username || "Unknown";

          return {
            ...post,
            id: post._id,

            // --- CRITICAL: Attach the gallery we just built ---
            mediaGallery: gallery,
            media: gallery.length > 0 ? gallery[0] : null,

            author: {
              id: postUser._id || post.userId,
              name: realName,
              avatar: postUser.profileImage
                ? ensureAbsoluteUrl(postUser.profileImage)
                : avatarFromSeed(postUser.username || "user"),
            },
            content:
              post.text ||
              post.content ||
              post.caption ||
              post.description ||
              "",
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
                name:
                  c.user?.name ||
                  c.user?.fullName ||
                  c.user?.username ||
                  "Unknown",
                avatar: c.user?.profileImage
                  ? ensureAbsoluteUrl(c.user?.profileImage)
                  : avatarFromSeed(c.user?.username || "user"),
              },
              createdAt: c.createdAt,
            })),
          };
        });

        setProfile(
          meData?._id === profileUserId
            ? meData
            : { ...meData, _id: profileUserId }
        );
        setPosts(normalizedPosts);
        setFollowers(meData.followers ?? []);
        setFollowing(meData.following ?? []);

        if (profileUserId === resolveUserId(meData)) {
          try {
            const seedsResponse = await fetchMySeedPrices();
            const prices = seedsResponse?.data ?? seedsResponse ?? [];
            setMySeedPrices(prices);
          } catch (err) {
            console.error("Failed to fetch seed prices", err);
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Profile load করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUserAndProfile();
  }, [username]);

  const viewerIdentity = useMemo(() => {
    if (currentUser) {
      const fallbackSeed = currentUser.username || currentUser.name || "viewer";
      return {
        id: resolveUserId(currentUser) ?? `viewer-${fallbackSeed}`,
        name: currentUser.name || currentUser.username || "You",
        username: currentUser.username || fallbackSeed,
        avatar: currentUser.profileImage
          ? ensureAbsoluteUrl(currentUser.profileImage)
          : currentUser.avatar
          ? ensureAbsoluteUrl(currentUser.avatar)
          : avatarFromSeed(fallbackSeed),
      };
    }
    return {
      id: "viewer-guest",
      name: "You",
      username: "guest",
      avatar: avatarFromSeed("guest"),
    };
  }, [currentUser]);

  const currentUserId = resolveUserId(currentUser);
  const profileOwnerId = resolveUserId(profile);
  const isOwner = Boolean(
    (currentUserId &&
      profileOwnerId &&
      String(currentUserId).toLowerCase() ===
        String(profileOwnerId).toLowerCase()) ||
      (!username && currentUserId)
  );

  const stats = useMemo(
    () => ({
      posts: posts?.length,
      followers: followers.length,
      following: following.length,
    }),
    [posts?.length, followers.length, following.length]
  );

  const toggleLike = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const willLike = !post.liked;
    try {
      await likePost(postId, willLike);
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
    } catch (error) {
      console.error("Failed to like post", error);
      toast.error("Like করা যায়নি");
    }
  };

  const addComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const response = await commentOnPost(postId, text);
      const commentData = response.post.comments.slice(-1)[0];
      const newComment = {
        id: commentData._id,
        text: commentData.text,
        createdAt: commentData.createdAt,
        author: {
          id: resolveUserId(commentData.user) || resolveUserId(currentUser),
          name:
            commentData.user?.name ||
            commentData.user?.username ||
            currentUser?.name ||
            currentUser?.username ||
            "You",
          avatar: commentData.user?.profileImage
            ? ensureAbsoluteUrl(commentData.user.profileImage)
            : currentUser?.profileImage ||
              currentUser?.avatar ||
              avatarFromSeed(currentUser?.username || "current"),
        },
      };
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      );
      toast.success("মন্তব্য যোগ হয়েছে");
    } catch (error) {
      console.error("Failed to add comment", error);
      toast.error("মন্তব্য যোগ করা যায়নি");
    }
  };

  const removeComment = async (postId, commentId) => {
    try {
      await deleteComment(postId, commentId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: (p.comments || []).filter((c) => c.id !== commentId),
              }
            : p
        )
      );
      toast.success("মন্তব্য মুছে ফেলা হয়েছে");
    } catch (error) {
      console.error("Failed to delete comment", error);
      toast.error("মন্তব্য মুছে ফেলা যায়নি");
    }
  };

  const deletePostHandler = async (postId) => {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      if (activePostId === postId) closeActivePost();
      toast.success("পোস্ট মুছে ফেলা হয়েছে");
    } catch (error) {
      console.error("Failed to delete post", error);
      toast.error("পোস্ট মুছে ফেলা যায়নি");
    }
  };

  const deleteSeedHandler = async (priceId) => {
    console.log("Deleting seed ID:", priceId);
    if (!priceId) {
      toast.error("Invalid price ID");
      return;
    }
    try {
      await deleteSeedPrice(priceId);
      setMySeedPrices((prev) => prev.filter((s) => s._id !== priceId));
      toast.success("Seed price মুছে ফেলা হয়েছে");
    } catch (error) {
      console.error("Failed to delete seed price", error);
      toast.error("Seed price মুছে ফেলা যায়নি");
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const submitComposer = async (payload) => {
    if (!payload) return;
    try {
      setSubmitting(true);
      const formData = new FormData();
      if (payload.text) formData.append("text", payload.text);
      payload.images?.forEach((file) => formData.append("images", file));
      payload.videos?.forEach((file) => formData.append("videos", file));

      const response = await createPost(formData);
      const postData = response?.data?.post || response?.post || response;

      // Re-use logic for new post (simplifed)
      const gallery = [];
      if (postData.images)
        postData.images.forEach((img) =>
          gallery.push({ type: "image", src: ensureAbsoluteUrl(img) })
        );
      if (postData.videos)
        postData.videos.forEach((vid) =>
          gallery.push({ type: "video", src: ensureAbsoluteUrl(vid) })
        );

      setPosts((prev) => [
        {
          ...postData,
          id: postData._id,
          mediaGallery: gallery,
          media: gallery.length > 0 ? gallery[0] : null,
          author: {
            id: currentUser._id,
            name: currentUser.name || currentUser.username || "You",
            avatar: currentUser.profileImage
              ? ensureAbsoluteUrl(currentUser.profileImage)
              : avatarFromSeed(currentUser.username || "current"),
          },
          content:
            postData.text ||
            postData.content ||
            postData.caption ||
            postData.description ||
            "",
          likes: 0,
          liked: false,
          comments: [],
        },
        ...prev,
      ]);

      toast.success("পোস্ট সফলভাবে তৈরি হয়েছে");
      setComposerOpen(false);
    } catch (error) {
      console.error("Failed to create post", error);
      toast.error("পোস্ট তৈরি করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="profile-page profile-page--loading">
        <LiquedLoader label="প্রোফাইল লোড হচ্ছে..." />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <ProfileOverview
        profile={profile}
        stats={stats}
        isOwner={isOwner}
        isFollowing={isFollowingProfile}
        showPrimaryAction={!isOwner}
        onPrimaryAction={() => toast.success("প্রোফাইল সম্পাদনা")}
        onOpenAllPosts={() => setAllPostsOpen(true)}
        onOpenFollowers={() => setFollowersOpen(true)}
        onOpenFollowing={() => setFollowingOpen(true)}
      />

      <div className="profile-two-column">
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

        <section className="post-feed">
          {isOwner && (
            <CreatePost
              user={profile.name || profile.username || "You"}
              profile={profile.profileImage}
              onTextClick={() => {
                setComposerMode("text");
                setComposerOpen(true);
              }}
              onPhotoVideoClick={() => {
                setComposerMode("media");
                setComposerOpen(true);
                setTimeout(() => {
                  composerRef.current?.triggerFileInput();
                }, 100);
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
        title="অনুসরণকারী"
        users={followers}
      />

      <FollowListModal
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title="আপনি যাদের অনুসরণ করছেন"
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
        viewer={{
          name: viewerIdentity?.name,
          username: viewerIdentity?.username,
          avatar: viewerIdentity?.avatar,
        }}
      />
    </div>
  );
}
