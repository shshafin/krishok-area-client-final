import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";
import DeleteOutlineIcon from "@/assets/IconComponents/DeleteOutlineIcon";
import { useVideoVisibility } from "@/hooks/useVideoVisibility";

// --- TEXT CONSTANTS ---
const TEXT_LIKED = "লাইক করা হয়েছে";
const TEXT_LIKE = "লাইক";
const TEXT_COMMENTS = "মন্তব্য";
const TEXT_COMMENT = "মন্তব্য";
const TEXT_COMMENT_PLACEHOLDER = "মন্তব্য করুন...";
const TEXT_DELETE_POST_ARIA = "পোস্ট মুছে ফেলুন";
const TEXT_MEDIA_ALT = "পোস্টের ছবি";
const TEXT_LIKE_COUNT_SUFFIX = "লাইক";
const TEXT_COMMENT_COUNT_SUFFIX = "মন্তব্য";

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

  const showDeleteButton = Boolean(
    isOwner && location?.pathname?.startsWith("/me")
  );

  const submitComment = () => {
    const value = commentText.trim();
    if (!value) return;
    onAddComment?.(post.id, value);
    setCommentText("");
  };

  // --- FIXED: Accept index and pass it to parent ---
  const handleOpenPost = (index = 0) => {
    onOpenPost?.(post.id, index);
  };

  const handleMediaKeyDown = (event, index = 0) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenPost(index);
    }
  };

  // Container props now default to index 0
  const mediaInteractableProps = onOpenPost
    ? {
        role: "button",
        tabIndex: 0,
        onClick: () => handleOpenPost(0),
        onKeyDown: (e) => handleMediaKeyDown(e, 0),
      }
    : {};

  const allGalleryItems = Array.isArray(post.mediaGallery)
    ? post.mediaGallery.filter((item) => item && item.src)
    : [];

  const totalItems = allGalleryItems.length;
  const displayItems = allGalleryItems.slice(0, 4);
  const extraImageCount = totalItems > 4 ? totalItems - 4 : 0;

  const getGridConfig = (count) => {
    if (count === 1) {
      return {
        gridTemplateColumns: "1fr",
        height: "auto",
        maxHeight: "500px",
        aspectRatio: "auto",
      };
    }
    if (count === 2) return { gridTemplateColumns: "1fr 1fr" };
    if (count === 3)
      return {
        gridTemplateColumns: "2fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
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

    if (count === 3 && index === 0) {
      return { ...baseStyle, gridRow: "span 2" };
    }
    if (count >= 4 && index === 0) {
      return { ...baseStyle, gridRow: "span 3" };
    }
    return baseStyle;
  };

  return (
    <article className="post-card">
      <header className="post-card-header">
        <NavLink
          to={
            post.author?._id
              ? `/user/${post.author._id}`
              : `/user/${post.author.id ?? post.author._id ?? ""}`
          }
          className="post-card-meta">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            style={{ objectFit: "cover" }}
          />
          <div className="post-card-author">
            <h5>{post.author.name}</h5>
            <span>{format(post.createdAt)}</span>
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

      {totalItems > 0 && (
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

            // --- FIXED: Individual click handlers per item ---
            const itemProps = onOpenPost
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: (e) => {
                    e.stopPropagation(); // Stop bubbling to container
                    handleOpenPost(index); // Pass specific index
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
          onClick={() => onOpenLikes?.(post.id)}>
          {`${post.likes} ${TEXT_LIKE_COUNT_SUFFIX}`}
        </button>
        <button
          type="button"
          onClick={() => onOpenComments?.(post.id)}>
          {`${post.comments.length} ${TEXT_COMMENT_COUNT_SUFFIX}`}
        </button>
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
  // ... (Keep existing props)
  post: PropTypes.any,
  isOwner: PropTypes.bool,
  onLike: PropTypes.func,
  onOpenLikes: PropTypes.func,
  onOpenComments: PropTypes.func,
  onDelete: PropTypes.func,
  onAddComment: PropTypes.func,
  onOpenPost: PropTypes.func,
};
