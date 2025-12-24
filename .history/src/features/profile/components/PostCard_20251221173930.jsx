import { useState, useMemo } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useLocation, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";
import DeleteOutlineIcon from "@/assets/IconComponents/DeleteOutlineIcon";
import { useVideoVisibility } from "@/hooks/useVideoVisibility";
import { baseApi } from "../../../api";

// --- CONFIG ---
const API_URL = baseApi || "http://localhost:5001";
const TEXT_LIKED = "লাইক করা হয়েছে";
const TEXT_LIKE = "লাইক";
const TEXT_COMMENTS = "মন্তব্য";
const TEXT_COMMENT = "মন্তব্য";
const TEXT_COMMENT_PLACEHOLDER = "মন্তব্য করুন...";
const TEXT_DELETE_POST_ARIA = "পোস্ট মুছে ফেলুন";
const TEXT_MEDIA_ALT = "পোস্টের ছবি";
const TEXT_LIKE_COUNT_SUFFIX = "লাইক";
const TEXT_COMMENT_COUNT_SUFFIX = "মন্তব্য";

// --- HELPERS ---
const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${API_URL}/${cleanPath}`;
};

const formatTimeAgoBangla = (dateString) => {
  const timeStr = format(dateString);
  return timeStr
    .replace("just now", "এইমাত্র")
    .replace("right now", "এইমাত্র")
    .replace(/(\d+)\s+seconds? ago/, "$1 সেকেন্ড আগে")
    .replace(/(\d+)\s+minutes? ago/, "$1 মিনিট আগে")
    .replace(/(\d+)\s+hours? ago/, "$1 ঘণ্টা আগে")
    .replace(/(\d+)\s+days? ago/, "$1 দিন আগে")
    .replace(/(\d+)\s+weeks? ago/, "$1 সপ্তাহ আগে")
    .replace(/(\d+)\s+months? ago/, "$1 মাস আগে")
    .replace(/(\d+)\s+years? ago/, "$1 বছর আগে")
    .replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
};

// --- STYLES ---
const mediaContainerStyles = {
  width: "100%",
  height: "350px",
  display: "grid",
  gap: "2px",
  marginTop: "12px",
  position: "relative",
  overflow: "hidden",
  borderRadius: "0",
  margin: "12px 0 0 0",
};

export default function PostCard({
  post,
  isOwner,
  onLike,
  onOpenLikes,
  onOpenComments,
  onDelete,
  onAddComment,
  onOpenPost,
}) {
  const [commentText, setCommentText] = useState("");
  const location = useLocation();
  const videoRef = useVideoVisibility({ threshold: 0.3, priority: "normal" });

  // --- FIX 1: Smart Data Calculation ---
  // We re-calculate the gallery and author details right here in the card
  // This ensures it works even if the parent component sends "Raw" data.
  const { normalizedGallery, displayAuthor } = useMemo(() => {
    // 1. Build Gallery (Handle missing mediaGallery)
    let gallery = post.mediaGallery || [];

    // If gallery is empty, try to build it from raw arrays
    if (!Array.isArray(gallery) || gallery.length === 0) {
      gallery = [];
      const rawVideos = Array.isArray(post.videos)
        ? post.videos
        : post.video
        ? [post.video]
        : [];
      const rawImages = Array.isArray(post.images)
        ? post.images
        : post.image
        ? [post.image]
        : [];

      rawVideos.forEach((v) => {
        const src = typeof v === "object" ? v.src || v.url : v;
        if (src) gallery.push({ type: "video", src: ensureAbsoluteUrl(src) });
      });

      rawImages.forEach((i) => {
        const src = typeof i === "object" ? i.src || i.url : i;
        if (src) gallery.push({ type: "image", src: ensureAbsoluteUrl(src) });
      });
    }

    // 2. Resolve Author Name (Handle username vs name)
    const authObj = post.author || post.user || {};
    // Check deep nested user object if author is incomplete
    const userObj = post.user || {};

    const realName =
      authObj.name || userObj.name || authObj.username || "Unknown";
    const username = authObj.username || userObj.username || "";
    const userId = authObj._id || authObj.id || userObj._id || userObj.id;

    // Avatar Logic
    const avatarRaw =
      authObj.avatar ||
      authObj.profileImage ||
      userObj.profileImage ||
      userObj.avatar;
    const avatar = avatarRaw
      ? ensureAbsoluteUrl(avatarRaw)
      : `https://i.pravatar.cc/120?u=${username}`;

    return {
      normalizedGallery: gallery,
      displayAuthor: { id: userId, name: realName, avatar },
    };
  }, [post]);

  const showDeleteButton = Boolean(
    isOwner && location?.pathname?.startsWith("/me")
  );

  const submitComment = () => {
    const value = commentText.trim();
    if (!value) return;
    onAddComment?.(post.id, value);
    setCommentText("");
  };

  const handleOpenPost = (index = 0) => {
    onOpenPost?.(post.id, index);
  };

  const handleMediaKeyDown = (event, index = 0) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenPost(index);
    }
  };

  // --- GRID LOGIC ---
  const displayItems = normalizedGallery.slice(0, 4);
  const extraImageCount =
    normalizedGallery.length > 4 ? normalizedGallery.length - 4 : 0;

  const getGridConfig = (count) => {
    if (count === 1)
      return {
        gridTemplateColumns: "1fr",
        height: "auto",
        maxHeight: "500px",
        aspectRatio: "auto",
      };
    if (count === 2) return { gridTemplateColumns: "1fr 1fr" };
    if (count === 3)
      return { gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr" };
    if (count >= 4)
      return {
        gridTemplateColumns: "2fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr",
      };
    return {};
  };

  const getItemStyle = (index, count) => {
    const baseStyle = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    };
    if (count === 3 && index === 0) return { ...baseStyle, gridRow: "span 2" };
    if (count >= 4 && index === 0) return { ...baseStyle, gridRow: "span 3" };
    return baseStyle;
  };

  return (
    <article className="post-card">
      <header className="post-card-header">
        <NavLink
          to={`/user/${displayAuthor.id}`}
          className="post-card-meta">
          <img
            src={displayAuthor.avatar}
            alt={displayAuthor.name}
            style={{ objectFit: "cover" }}
          />
          <div className="post-card-author">
            <h5>{displayAuthor.name}</h5>
            <span>{formatTimeAgoBangla(post.createdAt)}</span>
          </div>
        </NavLink>
        {showDeleteButton && (
          <button
            type="button"
            className="post-delete-btn"
            aria-label={TEXT_DELETE_POST_ARIA}
            onClick={() => onDelete?.(post.id)}>
            <DeleteOutlineIcon width={16} />
          </button>
        )}
      </header>

      {post.content && (
        <div className="post-content">
          <ExpandableText text={post.content} />
        </div>
      )}

      {/* RENDER GALLERY */}
      {normalizedGallery.length > 0 && (
        <div
          className="post-media"
          style={{
            ...mediaContainerStyles,
            ...getGridConfig(displayItems.length),
          }}>
          {displayItems.map((item, index) => {
            const isOverflowItem = extraImageCount > 0 && index === 3;
            const itemStyle = getItemStyle(index, displayItems.length);
            const key = item.src ?? `media-${index}`;
            const itemProps = onOpenPost
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: (e) => {
                    e.stopPropagation();
                    handleOpenPost(index);
                  },
                  onKeyDown: (e) => handleMediaKeyDown(e, index),
                }
              : {};

            return (
              <div
                key={key}
                {...itemProps}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  gridRow: itemStyle.gridRow,
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "#000",
                }}>
                {item.type === "video" ? (
                  <video
                    ref={index === 0 ? videoRef : null}
                    src={item.src}
                    style={itemStyle}
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={post.content || TEXT_MEDIA_ALT}
                    style={itemStyle}
                  />
                )}
                {item.type === "video" && !isOverflowItem && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "40px",
                      height: "40px",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      pointerEvents: "none",
                    }}>
                    ▶
                  </div>
                )}
                {isOverflowItem && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "24px",
                      fontWeight: "bold",
                    }}>
                    +{extraImageCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="post-engagement">
        <button
          type="button"
          onClick={() =>
            onOpenLikes?.(post.id)
          }>{`${post.likes} ${TEXT_LIKE_COUNT_SUFFIX}`}</button>
        <button
          type="button"
          onClick={() =>
            onOpenComments?.(post.id)
          }>{`${post.comments.length} ${TEXT_COMMENT_COUNT_SUFFIX}`}</button>
      </div>

      <div className="post-actions">
        <button
          type="button"
          className={post.liked ? "liked" : ""}
          onClick={() => onLike?.(post.id)}>
          {post.liked ? TEXT_LIKED : TEXT_LIKE}
        </button>
        <button
          type="button"
          onClick={() => onOpenComments?.(post.id)}>
          {TEXT_COMMENTS}
        </button>
      </div>

      <div className="comment-form">
        <textarea
          name="comment"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={TEXT_COMMENT_PLACEHOLDER}
        />
        <button
          type="button"
          onClick={submitComment}>
          {TEXT_COMMENT}
        </button>
      </div>
    </article>
  );
}

PostCard.propTypes = {
  post: PropTypes.any,
  isOwner: PropTypes.bool,
  onLike: PropTypes.func,
  onOpenLikes: PropTypes.func,
  onOpenComments: PropTypes.func,
  onDelete: PropTypes.func,
  onAddComment: PropTypes.func,
  onOpenPost: PropTypes.func,
};
