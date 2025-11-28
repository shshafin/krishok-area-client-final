import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import "../styles/adminScoped.css";
import SearchIcon from "@/assets/IconComponents/SearchIcon";
import { fetchAllGalleries } from "@/api/authApi";
import { baseApi } from "../../../api";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatTimestamp = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const time = timeFormatter.format(date).toLowerCase(); // 10:06 pm
  const formattedDate = dateFormatter.format(date); // 19 June 2025

  return `${time} (${formattedDate})`;
};

export default function ManageGalleryPhotosPage() {
  const [galleries, setGalleries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGalleries = async () => {
      try {
        const res = await fetchAllGalleries();
        const galleryList = Array.isArray(res?.data) ? res.data : [];
        setGalleries(galleryList);
        setFiltered(galleryList);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load galleries");
      } finally {
        setIsLoading(false);
      }
    };
    loadGalleries();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(galleries);
    } else {
      const term = search.toLowerCase();
      setFiltered(
        galleries.filter((item) =>
          item.description?.toLowerCase().includes(term)
        )
      );
    }
  }, [search, galleries]);

  return (
    <div
      className="content-wrapper _scoped_admin"
      style={{ minHeight: "839px" }}>
      <Toaster position="top-right" />

      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Manage Gallery Photos</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <NavLink to="/admin/dashboard">Dashboard</NavLink>
                </li>
                <li className="breadcrumb-item active">Gallery</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="card w-100">
              <div className="card-header d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-lg-between">
                <div className="gallery-status d-flex flex-column gap-2">
                  <h3 className="card-title mb-0">Gallery Photos</h3>
                  <div className="manage-gallery-summary">
                    <span className="manage-gallery-chip manage-gallery-chip--visible">
                      Total {filtered.length}
                    </span>
                  </div>
                </div>
                <div
                  className="manage-gallery-search input-group"
                  style={{ maxWidth: 360 }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text">
                      <SearchIcon
                        size={18}
                        color="#64748b"
                      />
                    </span>
                  </div>
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search description"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="card-body">
                {isLoading ? (
                  <div className="text-center text-muted py-5">
                    Loading galleries...
                  </div>
                ) : filtered.length > 0 ? (
                  <div className="manage-gallery-grid">
                    {filtered.map((item) => (
                      <article
                        key={item._id}
                        className="manage-gallery-card">
                        <div className="manage-gallery-thumb">
                          <img
                            src={
                              item.image
                                ? item.image.startsWith("http")
                                  ? item.image
                                  : `${baseApi}${item.image}`
                                : "https://i.postimg.cc/fRVdFSbg/e1ef6545-86db-4c0b-af84-36a726924e74.png"
                            }
                            alt={item.description || "Gallery image"}
                          />
                        </div>
                        <div className="manage-gallery-body">
                          <p className="manage-gallery-description">
                            {item.description || "No description available"}
                          </p>
                        </div>
                        <footer className="manage-gallery-footer">
                          <div className="manage-gallery-info">
                            <span className="manage-gallery-time">
                              {formatTimestamp(item.createdAt)}
                            </span>
                          </div>
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    No photos found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
