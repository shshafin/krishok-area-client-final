import { useState, useMemo } from "react";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { format } from "timeago.js";

export default function PostCard({
  post,
  onLike,
  onOpenLikes,
  onOpenComments,
  onAddComment,
  onOpenPost,
}) {
  if (!post?.id) return null;

  const [commentText, setCommentText] = useState("");

  const author = post.author;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText);
    setCommentText("");
  };

  return (
    <article className="post-card">
      <header className="post-card-header">
        <NavLink to={`/user/${author.id}`}>
          <img
            src={author.avatar}
            alt={author.name}
          />
        </NavLink>
        <div>
          <h5>{author.name}</h5>
          <span>{format(post.createdAt)}</span>
        </div>
      </header>

      {post.content && <p>{post.content}</p>}

      {post.mediaGallery?.length > 0 && (
        <div className="post-media">
          {post.mediaGallery.map((m, i) => (
            <img
              key={i}
              src={m.src}
              onClick={() => onOpenPost(post.id, i)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      )}

      <div className="post-engagement">
        <button onClick={() => onOpenLikes(post.id)}>{post.likes} Likes</button>
        <button onClick={() => onOpenComments(post.id)}>
          {post.comments.length} Comments
        </button>
      </div>

      <div className="post-actions">
        <button onClick={() => onLike(post.id)}>
          {post.liked ? "Liked" : "Like"}
        </button>
        <button onClick={() => onOpenComments(post.id)}>Comment</button>
      </div>

      <div className="comment-form">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
        />
        <button onClick={submitComment}>Post</button>
      </div>
    </article>
  );
}

PostCard.propTypes = {
  post: PropTypes.object.isRequired,
  onLike: PropTypes.func,
  onOpenLikes: PropTypes.func,
  onOpenComments: PropTypes.func,
  onAddComment: PropTypes.func,
  onOpenPost: PropTypes.func,
};
