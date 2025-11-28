export function timeAgo(dateString) {
  if (!dateString) return "";

  // 🔹 বাংলা সংখ্যা থেকে ইংরেজিতে রূপান্তর
  const banglaToEnglish = (str) => {
    return str
      .replace(/০/g, "0")
      .replace(/১/g, "1")
      .replace(/২/g, "2")
      .replace(/৩/g, "3")
      .replace(/৪/g, "4")
      .replace(/৫/g, "5")
      .replace(/৬/g, "6")
      .replace(/৭/g, "7")
      .replace(/৮/g, "8")
      .replace(/৯/g, "9");
  };

  try {
    const englishDateStr = banglaToEnglish(dateString);
    // format: 26/10/2025, 10:08:20 AM → convert for Date()
    const [datePart, timePart] = englishDateStr.split(", ");
    const [day, month, year] = datePart.split("/");
    const formatted = `${year}-${month}-${day} ${timePart}`;
    const past = new Date(formatted);
    const now = new Date();

    if (isNaN(past.getTime())) return dateString; // fallback if invalid

    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    return past.toLocaleDateString("en-GB");
  } catch {
    return dateString;
  }
}
