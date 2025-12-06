import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5001/api/v1/notifications")
      .then((res) => setNotifications(res.data.notifications));
  }, []);

  const handleClick = async (n) => {
    // 1. Mark as read
    await axios.patch(
      `http://localhost:5001/api/v1/notifications/read/${n._id}`
    );

    // 2. Redirect based on type
    if (n.post?._id) {
      navigate(`/post/${n.post._id}`);
    } else if (n.sender?._id) {
      navigate(`/profile/${n.sender._id}`);
    } else {
      alert("No redirect path available");
    }
  };

  return (
    <div>
      <h2>Notifications</h2>
      {notifications.map((n) => (
        <div
          key={n._id}
          onClick={() => handleClick(n)}
          style={{
            borderBottom: "1px solid #ccc",
            padding: "10px",
            cursor: "pointer",
            background: n.isRead ? "white" : "#f7f7ff",
          }}>
          <b>{n.sender.username}</b> {n.message}{" "}
          {n.post?.text && `"${n.post.text}"`}
          {!n.isRead && (
            <span style={{ color: "red", marginLeft: "10px" }}>●</span>
          )}
        </div>
      ))}
    </div>
  );
}
