import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import ProfileOverview from "../components/ProfileOverview";
import ProfileSidebarNew from "../components/ProfileSidebarNew";
import PostCard from "../components/PostCard";
import { LiquedLoader } from "@/components/loaders";
import {
  fetchSingleUser,
  fetchUserPosts,
  fetchAllSeedPrices,
} from "@/api/authApi";
import { baseApi } from "../../../api";

const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?._id ?? user?.id ?? null;
}

export default function UserProfilePage() {
  const url = decodeURIComponent(location.pathname);
  const parts = url.split("/").filter(Boolean);
  const userId = parts[parts.length - 1] || "";
  console.log(userId);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [mySeedPrices, setMySeedPrices] = useState([]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // ১️⃣ Single user fetch
        const userResponse = await fetchSingleUser(userId);
        const userData = userResponse?.data ?? userResponse;
        setProfile(userData);

        // ২️⃣ User posts fetch
        const postsResponse = await fetchUserPosts(userData._id);
        const fetchedPosts = postsResponse?.posts ?? [];
        const normalizedPosts = fetchedPosts.map((post) => ({
          ...post,
          id: post._id,
          author: {
            id: post.user?._id || post.userId,
            name: post.user?.username || post.user?.name || "Unknown",
            avatar: post.user?.profileImage
              ? `${baseApi}${post.user.profileImage}`
              : avatarFromSeed(post.user?.username || "user"),
          },
          likes: Array.isArray(post.likes) ? post.likes.length : 0,
          liked: false, // readonly
          comments: (post.comments || []).map((c) => ({
            id: c._id,
            text: c.text,
            author: {
              id: resolveUserId(c.user),
              name: c.user?.username || c.user?.name || "Unknown",
              avatar: c.user?.profileImage
                ? `${baseApi}${c.user?.profileImage}`
                : avatarFromSeed(c.user?.username || "user"),
            },
            createdAt: c.createdAt,
          })),
          media:
            post.images?.length > 0
              ? { type: "image", src: `${baseApi}${post.images[0]}` }
              : post.videos?.length > 0
              ? { type: "video", src: `${baseApi}${post.videos[0]}` }
              : null,
        }));
        setPosts(normalizedPosts);

        // ৩️⃣ All seed prices fetch
        const seedsResponse = await fetchAllSeedPrices();
        const allSeeds = seedsResponse?.data ?? seedsResponse ?? [];
        const userSeeds = allSeeds.filter(
          (seed) => seed.user?._id === userData._id
        );
        setMySeedPrices(userSeeds);
      } catch (err) {
        console.error("Failed to load user profile", err);
        toast.error("User profile load করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadUserProfile();
  }, [userId]);

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
        stats={{
          posts: posts?.length || 0,
          followers: profile.followers?.length || 0,
          following: profile.following?.length || 0,
        }}
        isOwner={false}
        showPrimaryAction={false}
      />

      <div className="profile-two-column">
        <ProfileSidebarNew
          profile={profile}
          isOwner={false}
          compactSeedDisplay={true}
          seeds={mySeedPrices}
          hasMoreSeeds={false}
          onDeleteSeed={null}
          onOpenComposer={null}
        />

        <section className="post-feed">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isOwner={false}
              onLike={null} // readonly
              onOpenComments={null} // readonly
              onOpenLikes={null} // readonly
              onDelete={null} // readonly
              onAddComment={null} // readonly
              onOpenPost={null} // readonly
            />
          ))}
        </section>
      </div>
    </div>
  );
}
