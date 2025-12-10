import { useMemo, useRef, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { baseApi } from "../../../api";
// import ProductDetails from "./ProductDetails"; // Ensure this import matches your file structure

/** Category → heading CSS class map */
const categoryHeadingClass = {
  কীটনাশক: "kitnacxc_7x",
  ছত্রাকনাশক: "chotrcxc_7x",
  অনুখাদ্য: "unuxc_7x",
  আগাছানাশক: "agacxc_7x",
};

/** Mandatory Categories Order */
const PREFERRED_ORDER = ["কীটনাশক", "ছত্রাকনাশক", "আগাছানাশক", "অনুখাদ্য"];

/** Category header component */
function CategorySection({ title, isExpanded, onToggle }) {
  const cls = categoryHeadingClass[title] || "";
  return (
    <div className={`product-section ${cls}`}>
      <div
        className="product-section__header"
        onClick={onToggle}>
        <div className="product-section__title">{title}</div>
        <div className={`product-section__icon ${isExpanded ? "is-open" : ""}`}>
          <svg
            className="product-section__icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true">
            <path d="M7 14l5-5 5 5z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Helper: filter products by category & company */
const filterProducts = (products, categoryFilter, companyFilter) =>
  products.filter((p) => {
    const matchesCategory = categoryFilter
      ? p.category === categoryFilter
      : true;
    const matchesCompany = companyFilter ? p.company === companyFilter : true;
    return matchesCategory && matchesCompany;
  });

export default function ProductGrid({
  items = [],
  initialCount = 20,
  step = 10,
  categoryFilter = null,
  companyFilter = null,
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [visible, setVisible] = useState(initialCount);
  const sentinelRef = useRef(null);

  /** Filtered products */
  const filteredItems = useMemo(
    () => filterProducts(items, categoryFilter, companyFilter),
    [items, categoryFilter, companyFilter]
  );

  /** Group by category and order */
  const grouped = useMemo(() => {
    const byCat = new Map();

    // 1. Initialize with mandatory categories (empty arrays)
    PREFERRED_ORDER.forEach((cat) => {
      byCat.set(cat, []);
    });

    // 2. Populate with filtered items
    filteredItems.forEach((it) => {
      const cat = it.category || "অন্যান্য";
      // If item belongs to a category not in PREFERRED_ORDER, add it to map
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(it);
    });

    // 3. Sort items within each category by ID
    for (const arr of byCat.values()) {
      arr.sort((a, b) => String(a.id).localeCompare(String(b.id), "en"));
    }

    // 4. Return array sorted by preferred order
    // (Non-preferred categories usually go to the end)
    return Array.from(byCat.entries()).sort((a, b) => {
      const ia = PREFERRED_ORDER.indexOf(a[0]);
      const ib = PREFERRED_ORDER.indexOf(b[0]);

      // If both are not in preferred list, sort alphabetically
      if (ia === -1 && ib === -1) return a[0].localeCompare(b[0], "bn");
      // If A is not preferred but B is, B comes first
      if (ia === -1) return 1;
      // If B is not preferred but A is, A comes first
      if (ib === -1) return -1;
      // Both are preferred, sort by index
      return ia - ib;
    });
  }, [filteredItems]);

  /** Initialize expanded categories */
  useEffect(() => {
    // Expand all categories that exist in our grouped list
    const allCategories = new Set(grouped.map(([cat]) => cat));
    setExpandedCategories(allCategories);
  }, [grouped]);

  /** Reset visible count on items change */
  useEffect(() => setVisible(initialCount), [initialCount, items]);

  /** Infinite scroll observer */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting)
            setVisible((v) => Math.min(v + step, filteredItems.length));
        });
      },
      { rootMargin: "400px 0px", threshold: 0.01 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [filteredItems.length, step]);

  /** Toggle category expansion */
  const toggleCategory = (category) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  /** Render */
  return (
    <div className="product-align">
      {grouped.map(([cat, arr]) => {
        const isExpanded = expandedCategories.has(cat);
        const isEmpty = arr.length === 0;

        return (
          <div
            key={cat}
            className="category-block">
            <CategorySection
              title={cat}
              isExpanded={isExpanded}
              onToggle={() => toggleCategory(cat)}
            />
            {isExpanded && (
              <div className="category-row">
                {isEmpty ? (
                  // --- EMPTY STATE ---
                  <div
                    className="no-products-message"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                      width: "100%",
                      background: "#f9f9f9",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}>
                    এই ক্যাটাগরিতে কোনো পণ্য নেই
                  </div>
                ) : (
                  // --- PRODUCT LIST ---
                  arr
                    .slice(0, Math.max(0, Math.min(arr.length, visible)))
                    .map((item) => {
                      const { id, name, category, img } = item;
                      const url = `/productdetails/${id}`;
                      const categoryClass =
                        cat === "কীটনাশক"
                          ? "colorboxk"
                          : cat === "ছত্রাকনাশক"
                          ? "colorboxc"
                          : cat === "আগাছানাশক"
                          ? "colorboxw"
                          : cat === "অনুখাদ্য"
                          ? "colorboxf"
                          : "";
                      return (
                        <div
                          className="si"
                          key={`item-${id}`}>
                          <NavLink
                            to={url}
                            className="co product-card"
                            title={name}
                            aria-label={`${name} - ${category}`}>
                            <div className="product-card__media">
                              <img
                                src={`${baseApi}${img}`}
                                alt={name}
                                loading="lazy"
                              />
                            </div>
                            <div className="product-card__body">
                              <p
                                className={`product-card__category ${categoryClass}`}>
                                <span className="product-card__title">
                                  {name}
                                </span>
                                <br />
                                {category}
                              </p>
                            </div>
                          </NavLink>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        );
      })}
      <div ref={sentinelRef} />
    </div>
  );
}
