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

const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?.id ?? user?._id ?? user?.userId ?? user?.username ?? null;
}

// --- HELPER TO MERGE MEDIA CORRECTLY ---
const normalizeMedia = (postImages = [], postVideos = []) => {
  const images = (postImages || []).map((img) => ({
    type: "image",
    src: `${baseApi}${img}`,
  }));

  const videos = (postVideos || []).map((vid) => ({
    type: "video",
    src: `${baseApi}${vid}`,
  }));

  const combined = [...videos, ...images];

  return {
    media: combined.length > 0 ? combined[0] : null,
    mediaGallery: combined,
  };
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
  const [selectedIndex, setSelectedIndex] = useState(0); // <--- ADDED THIS STATE

  const composerRef = useRef(null);

  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setActivePostMode("comments");
    setSelectedIndex(0); // Reset index on close
  }, []);

  // --- UPDATED: Accepts index ---
  const openPostComments = useCallback((postId, index = 0) => {
    setActivePostMode("comments");
    setActivePostId(postId);
    setSelectedIndex(index); // Store the clicked index
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
        const fetchedPosts = postsResponse ?? [];

        const normalizedPosts = (fetchedPosts.posts || []).map((post) => {
          const { media, mediaGallery } = normalizeMedia(
            post.images,
            post.videos
          );

          return {
            ...post,
            id: post._id,
            author: {
              id: post.user?._id || post.userId,
              name: post.user?.name || post.user?.username || "Unknown",
              avatar: post.user?.profileImage
                ? `${baseApi}${post.user.profileImage}`
                : avatarFromSeed(post.user?.username || "user"),
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
                name: c.user?.username c.user?.name || c.user?.name || "Unknown",
                avatar: c.user?.profileImage
                  ? `${baseApi}${c.user?.profileImage}`
                  : avatarFromSeed(c.user?.username || "user"),
              },
              createdAt: c.createdAt,
            })),
            media,
            mediaGallery,
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
          ? `${baseApi}${currentUser.profileImage}`
          : currentUser.avatar
          ? `${baseApi}${currentUser.avatar}`
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
          name: commentData.user?.username || currentUser?.username || "You",
          avatar: commentData.user?.profileImage
            ? `${baseApi}${commentData.user.profileImage}`
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

      const { media, mediaGallery } = normalizeMedia(
        postData.images,
        postData.videos
      );

      setPosts((prev) => [
        {
          ...postData,
          id: postData._id,
          author: {
            id: currentUser._id,
            name: currentUser.name || currentUser.username || "You",
            avatar: currentUser.profileImage
              ? `${baseApi}${currentUser.profileImage}`
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
          media,
          mediaGallery,
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
              onOpenPost={openPostComments} // Accepts (id, index) now
            />
          ))}
        </section>
      </div>

      <AllPostsModal
        open={allPostsOpen}
        onClose={() => setAllPostsOpen(false)}
        posts={posts}
        onSelect={(post) => {
          openPostComments(post.id); // Defaults to index 0 for list view
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
        initialSlideIndex={selectedIndex} // <--- PASSED HERE
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
