export default function OrderStatusBadge({ status }) {
  const normalized = (status || "pending").toLowerCase().replace(/[_\s]+/g, "-");

  const getStatusStyles = () => {
    switch (normalized) {
      case "completed":
        return { bg: "#dcfce7", color: "#15803d", label: "Completed" };
      case "processing":
        return { bg: "#eff6ff", color: "#1d4ed8", label: "Processing" };
      case "pending":
      case "on-hold":
        return { bg: "#fef9c3", color: "#a16207", label: "Pending" };
      case "pending-payment":
        return { bg: "#fef9c3", color: "#a16207", label: "Pending payment" };
      case "qr-sent":
        return { bg: "#f3e8ff", color: "#7e22ce", label: "QR Sent" };
      case "shipped":
        return { bg: "#e0f2fe", color: "#0369a1", label: "Shipped" };
      case "cancelled":
      case "failed":
      case "refunded":
        return { bg: "#fee2e2", color: "#b91c1c", label: status };
      default:
        return { bg: "#f1f5f9", color: "#475569", label: status };
    }
  };

  const style = getStatusStyles();

  return (
    <span
      className="badge"
      style={{
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
