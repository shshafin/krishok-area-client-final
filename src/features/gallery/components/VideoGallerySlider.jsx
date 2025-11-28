import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { fetchAllVideos } from "@/api/authApi";

// Generate YouTube Thumbnail
const getYoutubeThumbnail = (url) => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/
  );
  return match
    ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    : "/placeholder.jpg";
};

const VideoGallerySlider = () => {
  const [emblaRef] = useEmblaCarousel(
    {
      loop: false,
      align: "start",
      dragFree: true,
      containScroll: "trimSnaps",
    },
    [
      Autoplay({
        delay: 3500,
        stopOnMouseEnter: true,
        stopOnInteraction: false,
      }),
    ]
  );

  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetchAllVideos();
        const videoList = Array.isArray(res?.data) ? res.data : [];

        const formatted = videoList.map((v) => ({
          id: v._id,
          title: v.title || v.description || "Untitled",
          thumbnail: v.thumbnail || getYoutubeThumbnail(v.videoUrl),
          videoUrl: v.videoUrl,
        }));

        setVideos(formatted);
      } catch (err) {
        console.error(err);
      }
    };
    loadVideos();
  }, []);

  const handleVideoClick = (video) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="video-gallery-container">
      <h2 className="gallery-title">বৈশিষ্ট্যযুক্ত ভিডিও</h2>

      <div
        className="embla"
        ref={emblaRef}>
        <div className="embla__container">
          {videos.map((video) => (
            <div
              key={video.id}
              className="embla__slide"
              onClick={() => handleVideoClick(video)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleVideoClick(video)}>
              <div className="video-card">
                <div className="thumbnail-container cursor-pointer">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="video-thumbnail w-full h-48 object-cover"
                  />
                </div>
                <div className="video-info mt-2">
                  <h3 className="video-title text-sm font-medium">
                    {video.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoGallerySlider;
