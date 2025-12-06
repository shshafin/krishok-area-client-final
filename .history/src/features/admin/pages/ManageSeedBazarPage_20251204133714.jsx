import { useEffect, useState } from "react";
import "../styles/adminScoped.css";
import BazarListManager from "@/features/admin/components/BazarListManager";
import { fetchAllSeedPrices, deleteSeedPrice } from "@/api/authApi";
import toast, { Toaster } from "react-hot-toast";

export default function ManageSeedBazarPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch all seed bazar prices
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        const res = await fetchAllSeedPrices();
        if (res?.success && Array.isArray(res.data)) {
          const formatted = res.data.map((entry) => ({
            id: entry._id,
            title: "Seed Bazar",
            description: entry.description || entry.note || "",
            imageUrl: entry.image || entry.imageUrl,
            recordedAt: entry.recordedAt,
            metadata: [{ label: "Location", value: entry.bazarName }],
          }));
          setEntries(formatted);
        } else {
          toast.error("Failed to load seed bazar entries");
        }
      } catch (err) {
        console.error(err);
        toast.error("Server error while fetching seed bazar entries");
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, []);

  // ✅ Backend delete handler
  const handleDeleteConfirmed = async (entry) => {
    try {
      const res = await deleteSeedPrice(entry.id);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to delete seed bazar entry");
      }
      // Remove from frontend state handled automatically inside BazarListManager
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || "Server error while deleting seed bazar entry"
      );
      throw err; // Important: throw so BazarListManager knows deletion failed
    }
  };

  if (loading) {
    return (
      <div className="p-5 text-center text-muted">
        Loading seed bazar entries...
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <BazarListManager
        title="Manage All Seed Bazar"
        description="Review recent seed bazar submissions and keep listings tidy."
        breadcrumb={[
          { to: "/admin/dashboard", label: "Admin Dashboard" },
          { label: "Manage All Seed Bazar" },
        ]}
        totalLabel={`Total Seed Bazar: ${entries.length}`}
        entries={entries}
        searchPlaceholder="Search by market name, description, or user ID"
        emptyMessage="No seed bazar entries matched your search."
        onDeleteConfirmed={handleDeleteConfirmed} // ✅ API call handled here
      />
    </>
  );
}
