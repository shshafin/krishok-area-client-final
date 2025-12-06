import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchNotifications, markRead } from "@/api/authApi";
import bookIcon from "@/assets/icons/Book.svg";
import homeIcon from "@/assets/icons/Home.svg";
import imageIcon from "@/assets/icons/Image.svg";
import followersIcon from "@/assets/icons/Followers.svg";
import notificationIcon from "@/assets/icons/Notification.svg";
import CloseIcon from "@/assets/IconComponents/Close";

const iconStyle = { width: 20, height: 20 };

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetchNotifications();
        setNotifications(res.notifications);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    loadNotifications();
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // FIX: Mongo uses "_id", not "id"
  const handleDismiss = (_id) => {
    setNotifications((prev) => prev.filter((notif) => notif._id !== _id));
  };

  const handleClearAll = () => setNotifications([]);

  // main → notification click
  const handleNotificationClick = async (n) => {
    // mark as read instantly
    await markRead(n._id);

    // update UI locally
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === n._id ? { ...item, isRead: true } : item
      )
    );

    // redirect
    if (n.post?._id) {
      navigate(`/?postId=${n.post._id}`);
    } else if (n.sender?._id) {
      navigate(`/profile/${n.sender._id}`);
    }

    setIsOpen(false); // close popup after click
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav
      className="NavigationLinks"
      style={{ display: "flex", gap: "16px", alignItems: "center" }}>
      <NavLink to="/">
        <img
          src={homeIcon}
          alt="Home"
          style={iconStyle}
        />
      </NavLink>

      <NavLink to="/gallery">
        <img
          src={imageIcon}
          alt="Gallery"
          style={iconStyle}
        />
      </NavLink>

      <NavLink to="/guidelines">
        <img
          src={bookIcon}
          alt="Library"
          style={iconStyle}
        />
      </NavLink>

      {/* Notification Icon */}
      <section
        className="nav-notification"
        ref={popoverRef}>
        <button
          type="button"
          className={`nav-icon-button ${isOpen ? "is-open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}>
          <img
            src={notificationIcon}
            alt="Notifications"
            style={iconStyle}
          />
          {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
        </button>

        {isOpen && (
          <aside className="notification-popover">
            <header className="notification-popover__header">
              <div>
                <span className="notification-popover__title">বিজ্ঞপ্তি</span>
                <p className="notification-popover__subtitle">
                  আপনার সাম্প্রতিক কার্যকলাপ সম্পর্কে দ্রুত আপডেট
                </p>
              </div>

              <button
                type="button"
                className="notification-clear"
                onClick={handleClearAll}
                disabled={!notifications.length}>
                Clear
              </button>
            </header>

            <div className="notification-popover__list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <article
                    className="notification-item"
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: "pointer" }}>
                    <div className="notification-avatar-wrapper">
                      <img
                        src={notification.sender?.profileImage || ""}
                        alt={notification.sender?.username || "User"}
                        className="notification-avatar"
                      />
                    </div>

                    <div className="notification-body">
                      <span className="notification-author">
                        {notification.sender?.username}
                      </span>

                      <p className="notification-message">
                        {notification.message}
                      </p>

                      <time className="notification-time">
                        {new Date(notification.createdAt).toLocaleString()}
                      </time>
                    </div>

                    {/* dismiss button */}
                    <button
                      type="button"
                      className="notification-dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification._id);
                      }}>
                      <CloseIcon
                        width={14}
                        height={14}
                      />
                    </button>
                  </article>
                ))
              ) : (
                <div className="notification-empty">
                  <p>সব কিছু আপডেটেড! নতুন কোনো নোটিফিকেশন নেই।</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </section>

      <NavLink to="/me">
        <img
          src={followersIcon}
          alt="My profile"
          style={iconStyle}
        />
      </NavLink>
    </nav>
  );
}

export default Navigation;
