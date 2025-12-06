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
        // Fetch all products
        const allRes = await fetchAllProducts();
        const allProducts = allRes.data || [];

        // Filter products with same company._id and category
        const filtered = allProducts.filter(
          (p) =>
            p._id !== productId && // exclude current product itself
            p.company?._id === currentProduct.company?._id &&
            p.category === currentProduct.category
        );

        // Map for gallery
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

  // --- MODIFIED SECTION START ---
  // 1. Parse JSON strings back into actual Arrays
  const fosholList = JSON.parse(foshol || "[]");
  const balaiList = JSON.parse(balai || "[]");
  const matraList = JSON.parse(matra || "[]");
  const beboharBidhiList = JSON.parse(beboharBidhi || "[]");

  // 2. We loop based on the foshol list (assuming it exists for every row).
  // If foshol is empty but others exist, you might want to use Math.max length.
  // For now, mapping over fosholList is the standard approach.
  // --- MODIFIED SECTION END ---

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
          {/* Added whiteSpace: pre-line to handle \r\n in the text correctly */}
          <p style={{ whiteSpace: "pre-line" }}>{beboharerShubidha}</p>
        </div>
      </div>

      <div className="product-details-tablesize">
        <div className="product-details-tabletitle">
          <h2>প্রয়োগ ক্ষেত্র ও মাত্রা</h2>

          {/* Header Row (Optional - Add this if you want column titles) */}
          <div
            className="product-details-container header-row"
            style={{
              fontWeight: "bold",
              marginBottom: "10px",
              display: "none",
            }}>
            {/* You can remove display:none to show headers if your CSS supports it */}
            <div>ফসল</div>
            <div>বালাই</div>
            <div>মাত্রা</div>
            <div>ব্যবহার বিধি</div>
          </div>

          <div className="product-details-cardgrid">
            {/* 3. Map over the Arrays by Index */}
            {fosholList.map((cropItem, index) => (
              <article
                key={index}
                className="product-details-container">
                {/* Column 1: Foshol (Crop) */}
                <div className="product-details-infocard">
                  <span className="mobile-label">ফসল: </span>{" "}
                  {/* Optional label for mobile */}
                  <div className="product-details-cropcard">{cropItem}</div>
                </div>

                {/* Column 2: Balai (Pest) */}
                <div className="product-details-infocard">
                  <span className="mobile-label">বালাই: </span>
                  <div className="product-details-cropcard">
                    {balaiList[index] || ""}
                  </div>
                </div>

                {/* Column 3: Matra (Dose) */}
                <div className="product-details-infocard">
                  <span className="mobile-label">মাত্রা: </span>
                  {/* style pre-wrap handles \n inside the dose string */}
                  <div
                    className="product-details-cropcard"
                    style={{ whiteSpace: "pre-wrap" }}>
                    {matraList[index] || ""}
                  </div>
                </div>

                {/* Column 4: Bebohar Bidhi (Usage) */}
                <div className="product-details-infocard">
                  <span className="mobile-label">ব্যবহার বিধি: </span>
                  <div className="product-details-cropcard">
                    {beboharBidhiList[index] || ""}
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
