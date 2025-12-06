import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";
import DeleteOutlineIcon from "@/assets/IconComponents/DeleteOutlineIcon";
import { useVideoVisibility } from "@/hooks/useVideoVisibility";

const mediaStyles = {
  width: "100%",
  display: "block",
  objectFit: "cover",
  height: "100%",
};

const TEXT_LIKED =
  "\u09B2\u09BE\u0987\u0995 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7";
const TEXT_LIKE = "\u09B2\u09BE\u0987\u0995";
const TEXT_COMMENTS = "\u09AE\u09A8\u09CD\u09A4\u09AC\u09CD\u09AF";
const TEXT_COMMENT = "\u09AE\u09A8\u09CD\u09A4\u09AC\u09CD\u09AF";
const TEXT_COMMENT_PLACEHOLDER =
  "\u09AE\u09A8\u09CD\u09A4\u09AC\u09CD\u09AF \u0995\u09B0\u09C1\u09A8...";
const TEXT_DELETE_POST_ARIA =
  "\u09AA\u09CB\u09B8\u09CD\u099F \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09C1\u09A8";
const TEXT_MEDIA_ALT =
  "\u09AA\u09CB\u09B8\u09CD\u099F\u09C7\u09B0 \u099B\u09AC\u09BF";
const TEXT_LIKE_COUNT_SUFFIX = "\u09B2\u09BE\u0987\u0995";
const TEXT_COMMENT_COUNT_SUFFIX = "\u09AE\u09A8\u09CD\u09A4\u09AC\u09CD\u09AF";

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

  // --- UNIFIED GALLERY LOGIC ---
  // 1. Get ALL valid items (Video + Images)
  const allGalleryItems = Array.isArray(post.mediaGallery)
    ? post.mediaGallery.filter((item) => item && item.src)
    : [];

  // 2. Calculate display logic
  const totalItems = allGalleryItems.length;
  // We grab the first 4 items to display in the grid
  const displayItems = allGalleryItems.slice(0, 4);
  const extraImageCount = totalItems > 4 ? totalItems - 4 : 0;

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

      {/* --- UNIFIED MEDIA SECTION --- */}
      {totalItems > 0 && (
        <div
          className="post-media"
          {...mediaInteractableProps}>
          {/* CASE 1: Single Item (Full View) */}
          {totalItems === 1 ? (
            <div className="post-media-single">
              {displayItems[0].type === "video" ? (
                <video
                  ref={videoRef}
                  src={displayItems[0].src}
                  controls
                  muted
                  loop
                  style={mediaStyles}
                />
              ) : (
                <img
                  src={displayItems[0].src}
                  alt={post.content || TEXT_MEDIA_ALT}
                  style={mediaStyles}
                />
              )}
            </div>
          ) : (
            /* CASE 2: Multiple Items (Grid View) */
            /* The class `count-2` etc., handles the CSS layout (e.g. side-by-side) */
            <div className={`post-media-grid count-${displayItems.length}`}>
              {displayItems.map((item, index) => {
                const isOverflowItem = extraImageCount > 0 && index === 3;
                const key = item.src ?? `media-${index}`;

                return (
                  <div
                    key={key}
                    className={`post-media-grid-item${
                      isOverflowItem ? " post-media-grid-item--more" : ""
                    }`}>
                    {item.type === "video" ? (
                      <video
                        // Attach ref only to the first video found to manage autoplay
                        ref={index === 0 ? videoRef : null}
                        src={item.src}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.src}
                        alt={post.content || TEXT_MEDIA_ALT}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}

                    {/* Play Icon for Videos in Grid */}
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

                    {/* +X More Overlay */}
                    {isOverflowItem && (
                      <span className="post-media-grid-more-label">
                        +{extraImageCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string,
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]).isRequired,
    media: PropTypes.shape({
      type: PropTypes.oneOf(["image", "video"]),
      src: PropTypes.string,
    }),
    mediaGallery: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.oneOf(["image", "video"]),
        src: PropTypes.string,
      })
    ),
    likes: PropTypes.number,
    liked: PropTypes.bool,
    likedUsers: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        username: PropTypes.string,
        avatar: PropTypes.string,
      })
    ),
    author: PropTypes.shape({
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
    }).isRequired,
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
          .isRequired,
      })
    ),
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
  onLike: undefined,
  onOpenLikes: undefined,
  onOpenComments: undefined,
  onDelete: undefined,
  onAddComment: undefined,
  onOpenPost: undefined,
};
