import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useLocation, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";
import DeleteOutlineIcon from "@/assets/IconComponents/DeleteOutlineIcon";
import { useVideoVisibility } from "@/hooks/useVideoVisibility";
import { baseApi } from "../../../api";

// --- CONFIG ---
const API_URL = baseApi || "http://localhost:5001";

// --- HELPERS ---
const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${API_URL}/${cleanPath}`;
};

const formatTimeAgo = (dateString) => {
  try {
    return format(dateString);
  } catch (e) {
    return "Just now";
  }
};

export default function PostCard({
  post,
  isOwner,
  // --- NEW PROPS ---
  handleLikeAction,
  handleCommentAction,

  onDelete,
  onAddComment,
  onOpenPost,
}) {
  const [commentText, setCommentText] = useState("");
  const location = useLocation();
  const videoRef = useVideoVisibility({ threshold: 0.3, priority: "normal" });

  const POST_ID = post.id || post._id;

  // --- RESOLVE DATA ---
  const userObj = post.user || {};
  const authObj = post.author || {};
  const authorName =
    userObj.name || authObj.name || userObj.username || "Unknown";
  const authorId = userObj._id || userObj.id || authObj._id || authObj.id;
  const rawAvatar = userObj.profileImage || authObj.avatar;
  const authorAvatar = rawAvatar
    ? ensureAbsoluteUrl(rawAvatar)
    : `https://i.pravatar.cc/120?u=${authorId}`;

  // Build Gallery
  let gallery = post.mediaGallery || [];
  if (!Array.isArray(gallery) || gallery.length === 0) {
    gallery = [];
    const videos = Array.isArray(post.videos)
      ? post.videos
      : post.video
      ? [post.video]
      : [];
    const images = Array.isArray(post.images)
      ? post.images
      : post.image
      ? [post.image]
      : [];
    videos.forEach((v) => {
      const src = typeof v === "object" ? v.src || v.url : v;
      if (src) gallery.push({ type: "video", src: ensureAbsoluteUrl(src) });
    });
    images.forEach((i) => {
      const src = typeof i === "object" ? i.src || i.url : i;
      if (src) gallery.push({ type: "image", src: ensureAbsoluteUrl(src) });
    });
  }

  // --- HANDLERS ---
  const onLikeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("PostCard: Like Clicked", POST_ID);
    if (handleLikeAction) {
      handleLikeAction(POST_ID);
    } else {
      console.error("PostCard: handleLikeAction is MISSING");
    }
  };

  const onCommentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleCommentAction) handleCommentAction(POST_ID);
  };

  const submitComment = () => {
    const value = commentText.trim();
    if (!value) return;
    onAddComment?.(POST_ID, value);
    setCommentText("");
  };

  // Grid Config
  const displayItems = gallery.slice(0, 4);
  const extraCount = gallery.length > 4 ? gallery.length - 4 : 0;

  const getGridStyle = (idx, total) => {
    const style = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    };
    if (total === 3 && idx === 0) return { ...style, gridRow: "span 2" };
    if (total >= 4 && idx === 0) return { ...style, gridRow: "span 3" };
    return style;
  };

  const gridConfig = {
    display: "grid",
    width: "100%",
    height: "350px",
    gap: "2px",
    marginTop: "12px",
    gridTemplateColumns: displayItems.length === 1 ? "1fr" : "1fr 1fr",
    gridTemplateRows: displayItems.length > 2 ? "1fr 1fr" : "1fr",
  };
  if (displayItems.length === 3) {
    gridConfig.gridTemplateColumns = "2fr 1fr";
    gridConfig.gridTemplateRows = "1fr 1fr";
  }
  if (displayItems.length >= 4) {
    gridConfig.gridTemplateColumns = "2fr 1fr";
    gridConfig.gridTemplateRows = "1fr 1fr 1fr";
  }

  return (
    <article
      className="post-card"
      style={{
        position: "relative",
        marginBottom: "20px",
        background: "#fff",
        padding: "10px",
        borderRadius: "8px",
      }}>
      <header className="post-card-header">
        <NavLink
          to={`/user/${authorId}`}
          className="post-card-meta">
          <img
            src={authorAvatar}
            alt={authorName}
            style={{ objectFit: "cover" }}
          />
          <div className="post-card-author">
            <h5>{authorName}</h5>
            <span>{formatTimeAgo(post.createdAt)}</span>
          </div>
        </NavLink>
        {isOwner && location?.pathname?.startsWith("/me") && (
          <button
            type="button"
            className="post-delete-btn"
            onClick={() => onDelete?.(POST_ID)}>
            <DeleteOutlineIcon width={16} />
          </button>
        )}
      </header>

      {post.content && (
        <div className="post-content">
          <ExpandableText text={post.content} />
        </div>
      )}

      {gallery.length > 0 && (
        <div
          className="post-media"
          style={gridConfig}>
          {displayItems.map((item, index) => {
            const isOverflow = extraCount > 0 && index === 3;
            const style = getGridStyle(index, displayItems.length);
            return (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPost?.(POST_ID, index);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "#000",
                  gridRow: style.gridRow,
                }}>
                {item.type === "video" ? (
                  <video
                    src={item.src}
                    style={style}
                    ref={index === 0 ? videoRef : null}
                    muted
                  />
                ) : (
                  <img
                    src={item.src}
                    style={style}
                    alt="Post media"
                  />
                )}
                {isOverflow && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}>
                    +{extraCount}
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
          onClick={onCommentClick}>
          {post.likes || 0} Likes
        </button>
        <button
          type="button"
          onClick={onCommentClick}>
          {post.comments?.length || 0} Comments
        </button>
      </div>

      <div
        className="post-actions"
        style={{
          position: "relative",
          zIndex: 100,
          display: "flex",
          gap: "10px",
          padding: "8px 0",
        }}>
        <button
          type="button"
          className={post.liked ? "liked" : ""}
          onClick={onLikeClick}
          style={{ cursor: "pointer", padding: "8px", pointerEvents: "auto" }}>
          {post.liked ? "Liked" : "Like"}
        </button>

        <button
          type="button"
          onClick={onCommentClick}
          style={{ cursor: "pointer", padding: "8px", pointerEvents: "auto" }}>
          Comment
        </button>
      </div>

      <div
        className="comment-form"
        style={{ position: "relative", zIndex: 100 }}>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
        />
        <button
          type="button"
          onClick={submitComment}>
          Post
        </button>
      </div>
    </article>
  );
}

PostCard.propTypes = {
  post: PropTypes.any,
  isOwner: PropTypes.bool,
  handleLikeAction: PropTypes.func, // New Prop
  handleCommentAction: PropTypes.func, // New Prop
  onDelete: PropTypes.func,
  onAddComment: PropTypes.func,
  onOpenPost: PropTypes.func,
};
