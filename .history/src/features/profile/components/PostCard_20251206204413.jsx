import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";
import DeleteOutlineIcon from "@/assets/IconComponents/DeleteOutlineIcon";
import { useVideoVisibility } from "@/hooks/useVideoVisibility";

const TEXT_LIKED = "লাইক করা হয়েছে";
const TEXT_LIKE = "লাইক";
const TEXT_COMMENTS = "মন্তব্য";
const TEXT_COMMENT = "মন্তব্য";
const TEXT_COMMENT_PLACEHOLDER = "মন্তব্য করুন...";
const TEXT_DELETE_POST_ARIA = "পোস্ট মুছে ফেলুন";
const TEXT_MEDIA_ALT = "পোস্টের ছবি";
const TEXT_LIKE_COUNT_SUFFIX = "লাইক";
const TEXT_COMMENT_COUNT_SUFFIX = "মন্তব্য";

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

  // Video visibility hook
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

  const handleOpenPost = () => {
    onOpenPost?.(post.id);
  };

  const handleMediaKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenPost();
    }
  };

  const mediaInteractableProps = onOpenPost
    ? {
        role: "button",
        tabIndex: 0,
        onClick: handleOpenPost,
        onKeyDown: handleMediaKeyDown,
      }
    : {};

  // --- CHANGED: MEDIA PROCESSING ---
  const allGalleryItems = Array.isArray(post.mediaGallery)
    ? post.mediaGallery.filter((item) => item && item.src)
    : [];

  const totalItems = allGalleryItems.length;
  const displayItems = allGalleryItems.slice(0, 4);
  const extraImageCount = totalItems > 4 ? totalItems - 4 : 0;

  // --- NEW: DYNAMIC GRID LAYOUT STYLES ---
  // These styles fix the alignment issues while keeping your existing BG colors
  const getGridStyles = (count) => {
    const baseStyle = {
      display: "grid",
      width: "100%",
      height: "450px", // Fixed height ensures images don't stretch weirdly
      gap: "2px",
      overflow: "hidden",
      marginTop: "10px",
    };

    if (count === 1) {
      // Single item: No grid, just block, auto height usually better for single
      return {
        ...baseStyle,
        display: "block",
        height: "auto",
        maxHeight: "600px",
      };
    }

    if (count === 2) {
      return { ...baseStyle, gridTemplateColumns: "1fr 1fr" };
    }

    if (count === 3) {
      return {
        ...baseStyle,
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
    }

    if (count >= 4) {
      return {
        ...baseStyle,
        gridTemplateColumns: "1fr 1fr 1fr", // Split into 3 columns
        gridTemplateRows: "1fr 1fr", // 2 Rows
      };
    }
    return baseStyle;
  };

  // Helper to span items correctly (The "Facebook" Layout look)
  const getItemSpanStyle = (index, count) => {
    const commonImgStyle = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    };

    if (count === 3) {
      // Item 0 is big (left side), Item 1 & 2 are stacked (right side)
      if (index === 0) return { ...commonImgStyle, gridRow: "span 2" };
    }

    if (count >= 4) {
      // Item 0 is big (full width on top or big on left).
      // Let's do: Big Top, 3 small bottom
      if (index === 0)
        return { ...commonImgStyle, gridColumn: "span 3", height: "100%" };
    }

    return commonImgStyle;
  };

  return (
    // Reverted to your original class 'post-card' to keep background color
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
            // Ensure avatar doesn't get squashed
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

      {/* --- MEDIA BLOCK START --- */}
      {totalItems > 0 && (
        <div
          className="post-media" // Keeping your class
          {...mediaInteractableProps}
          // Applying inline grid styles to FIX ALIGNMENT specifically
          style={getGridStyles(displayItems.length)}>
          {displayItems.map((item, index) => {
            const isOverflowItem = extraImageCount > 0 && index === 3;
            const key = item.src ?? `media-${index}`;
            const itemStyle = getItemSpanStyle(index, displayItems.length);

            return (
              <div
                key={key}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  // Apply spans to the wrapper div
                  gridRow: itemStyle.gridRow,
                  gridColumn: itemStyle.gridColumn,
                }}>
                {item.type === "video" ? (
                  <video
                    ref={index === 0 ? videoRef : null}
                    src={item.src}
                    style={itemStyle} // Applies object-fit: cover
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={post.content || TEXT_MEDIA_ALT}
                    style={itemStyle} // Applies object-fit: cover
                  />
                )}

                {/* Video Icon */}
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

                {/* +More Overlay */}
                {isOverflowItem && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "20px",
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
      {/* --- MEDIA BLOCK END --- */}

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
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string,
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]).isRequired,
    mediaGallery: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.oneOf(["image", "video"]),
        src: PropTypes.string,
      })
    ),
    likes: PropTypes.number,
    liked: PropTypes.bool,
    author: PropTypes.shape({
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
      _id: PropTypes.string,
      id: PropTypes.string,
    }).isRequired,
    comments: PropTypes.array,
  }).isRequired,
  isOwner: PropTypes.bool,
  onLike: PropTypes.func,
  onOpenLikes: PropTypes.func,
  onOpenComments: PropTypes.func,
  onDelete: PropTypes.func,
  onAddComment: PropTypes.func,
  onOpenPost: PropTypes.func,
};

PostCard.defaultProps = {
  isOwner: false,
};
