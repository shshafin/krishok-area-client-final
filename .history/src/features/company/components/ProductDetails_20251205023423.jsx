import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ProductBackHeader from "./ProductBackHeader";
import SlideGallery from "./SlideGallery";
import { fetchProductById } from "@/api/authApi";
import { fetchAllProducts } from "@/api/authApi";
import "@/assets/styles/ProductDetails.css";
import { baseApi } from "../../../api";

export default function ProductDetails() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const productId = pathParts[pathParts.length - 1] || "";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryItems, setGalleryItems] = useState([]);

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    fetchProductById(productId)
      .then((res) => {
        setProduct(res.data);
        return res.data;
      })
      .then(async (currentProduct) => {
        const allRes = await fetchAllProducts();
        const allProducts = allRes.data || [];

        const filtered = allProducts.filter(
          (p) =>
            p._id !== productId &&
            p.company?._id === currentProduct.company?._id &&
            p.category === currentProduct.category
        );

        const galleryData = filtered.map((p) => ({
          id: p._id,
          name: p.productName,
          slug:
            p._id ||
            p.productName
              .toString()
              .trim()
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-"),
          img: p.productImage,
        }));

        setGalleryItems(galleryData);
      })
      .catch((err) => console.error("Error fetching product:", err))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading)
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;
  if (!product)
    return (
      <p style={{ textAlign: "center", marginTop: "2rem" }}>
        Product not found
      </p>
    );

  const {
    productImage,
    category,
    name: productName,
    materialName,
    beboharerShubidha,
    company,
    companySlug,
    foshol = "[]",
    balai = "[]",
    matra = "[]",
    beboharBidhi = "[]",
  } = product;

  // 1. Parse JSON strings
  const fosholList = JSON.parse(foshol || "[]");
  const balaiList = JSON.parse(balai || "[]");
  const matraList = JSON.parse(matra || "[]");
  const beboharBidhiList = JSON.parse(beboharBidhi || "[]");

  return (
    <div style={{ marginTop: "5rem" }}>
      <div className="product-details-boxsize">
        <div className="product-details-image">
          <img
            src={`${baseApi}${productImage}`}
            alt={productName || "product image"}
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/300x400?text=No+Image";
            }}
          />
        </div>

        <div className="product-details-text">
          <p className="newproduct-ctg">{category}</p>
          <h2 style={{ color: "white" }}>{productName}</h2>
          <p className="promatname">{materialName}</p>
          <h4>ব্যবহারের সুবিধা -:</h4>
          <p style={{ whiteSpace: "pre-line" }}>{beboharerShubidha}</p>
        </div>
      </div>

      <div className="product-details-tablesize">
        <div className="product-details-tabletitle">
          <h2>প্রয়োগ ক্ষেত্র ও মাত্রা</h2>

          <div className="product-details-cardgrid">
            {/* Map through the items by index */}
            {fosholList.map((crop, index) => (
              <article
                key={index}
                className="product-details-container">
                {/* We use one single 'infocard' (Blue Box) per set.
                  We force flex-direction column to stack the 4 rows inside.
                */}
                <div
                  className="product-details-infocard"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    alignItems: "flex-start",
                    padding: "15px", // Adjust padding as needed
                  }}>
                  {/* Row 1: Foshol */}
                  <div
                    className="product-details-crops"
                    style={{ width: "100%", justifyContent: "flex-start" }}>
                    <span
                      style={{
                        color: "#ccc",
                        minWidth: "80px",
                        fontWeight: "600",
                      }}>
                      ফসল:
                    </span>
                    <div className="product-details-cropcard">{crop}</div>
                  </div>

                  {/* Row 2: Balai */}
                  <div
                    className="product-details-crops"
                    style={{ width: "100%", justifyContent: "flex-start" }}>
                    <span
                      style={{
                        color: "#ccc",
                        minWidth: "80px",
                        fontWeight: "600",
                      }}>
                      বালাই:
                    </span>
                    <div className="product-details-cropcard">
                      {balaiList[index] || "-"}
                    </div>
                  </div>

                  {/* Row 3: Matra */}
                  <div
                    className="product-details-crops"
                    style={{ width: "100%", justifyContent: "flex-start" }}>
                    <span
                      style={{
                        color: "#ccc",
                        minWidth: "80px",
                        fontWeight: "600",
                      }}>
                      মাত্রা:
                    </span>
                    <div
                      className="product-details-cropcard"
                      style={{ whiteSpace: "pre-wrap" }}>
                      {matraList[index] || "-"}
                    </div>
                  </div>

                  {/* Row 4: Bebohar Bidhi */}
                  <div
                    className="product-details-crops"
                    style={{ width: "100%", justifyContent: "flex-start" }}>
                    <span
                      style={{
                        color: "#ccc",
                        minWidth: "80px",
                        fontWeight: "600",
                      }}>
                      ব্যবহার বিধি:
                    </span>
                    <div className="product-details-cropcard">
                      {beboharBidhiList[index] || "-"}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <ProductBackHeader
        companyName={company?.banglaName}
        companySlug={companySlug}
      />

      {galleryItems.length > 0 && <SlideGallery items={galleryItems} />}
    </div>
  );
}
