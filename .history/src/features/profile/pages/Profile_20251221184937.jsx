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
  createPost,
} from "@/api/authApi";

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

const API_URL = baseApi || "http://localhost:5001";

const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}/${url.replace(/^\/+/, "")}`;
};

const resolveUserId = (u) => u?._id || u?.id || u?.userId || null;

export default function ProfilePage() {
  const { username } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [activePostId, setActivePostId] = useState(null);
  const [activePostMode, setActivePostMode] = useState("comments");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setSelectedIndex(0);
  }, []);

  const openPostComments = useCallback((postId, index = 0) => {
    setActivePostId(postId);
    setActivePostMode("comments");
    setSelectedIndex(index);
  }, []);

  const openPostLikes = useCallback((postId) => {
    setActivePostId(postId);
    setActivePostMode("likes");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = (await fetchMe())?.data ?? {};
        setCurrentUser(me);

        const userId = username || resolveUserId(me);
        const res = await fetchUserPosts(userId);
        const rawPosts = res?.posts || res || [];

        const normalized = rawPosts.map((p) => {
          const user = p.user || {};
          const gallery = [];

          [...(p.images || []), ...(p.videos || [])].forEach((m) => {
            gallery.push({
              type: p.videos?.includes(m) ? "video" : "image",
              src: ensureAbsoluteUrl(m?.url || m),
            });
          });

          return {
            id: p._id,
            createdAt: p.createdAt,
            content: p.text || "",
            mediaGallery: gallery,
            likes: Array.isArray(p.likes) ? p.likes.length : 0,
            liked: p.likes?.some((l) => resolveUserId(l) === resolveUserId(me)),
            comments: (p.comments || []).map((c) => ({
              id: c._id,
              text: c.text,
              createdAt: c.createdAt,
              author: {
                id: resolveUserId(c.user),
                name: c.user?.name || c.user?.username,
                avatar: ensureAbsoluteUrl(c.user?.profileImage),
              },
            })),
            author: {
              id: resolveUserId(user),
              name: user.name || user.username,
              avatar: ensureAbsoluteUrl(user.profileImage),
            },
          };
        });

        setPosts(normalized);
        setProfile(me);
      } catch (e) {
        toast.error("Profile load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const toggleLike = async (postId) => {
    if (!postId) return;

    setPosts((p) =>
      p.map((x) =>
        x.id === postId
          ? {
              ...x,
              liked: !x.liked,
              likes: x.liked ? x.likes - 1 : x.likes + 1,
            }
          : x
      )
    );

    try {
      await likePost(postId);
    } catch {
      toast.error("Like failed");
    }
  };

  const addComment = async (postId, text) => {
    const res = await commentOnPost(postId, text);
    const c = res.comment;

    setPosts((p) =>
      p.map((x) =>
        x.id === postId
          ? {
              ...x,
              comments: [
                ...x.comments,
                {
                  id: c._id,
                  text: c.text,
                  createdAt: c.createdAt,
                  author: {
                    id: resolveUserId(currentUser),
                    name: currentUser.name,
                    avatar: ensureAbsoluteUrl(currentUser.profileImage),
                  },
                },
              ],
            }
          : x
      )
    );
  };

  if (loading) {
    return <LiquedLoader label="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <ProfileOverview profile={profile} />

      <section className="post-feed">
        <CreatePost
          onTextClick={() => {}}
          onPhotoVideoClick={() => {}}
        />

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={toggleLike}
            onOpenComments={openPostComments}
            onOpenLikes={openPostLikes}
            onAddComment={addComment}
            onOpenPost={openPostComments}
          />
        ))}
      </section>

      <PostModal
        open={Boolean(activePostId)}
        post={posts.find((p) => p.id === activePostId)}
        mode={activePostMode}
        initialSlideIndex={selectedIndex}
        onClose={closeActivePost}
        onToggleLike={toggleLike}
        onAddComment={addComment}
      />
    </div>
  );
}
