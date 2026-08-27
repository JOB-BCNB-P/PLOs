/** Clinical Aurora: clear clinical-status chips ensure every verdict remains legible on the dark data surface. */
import { Badge } from "@/components/ui/badge";
import { Check, Clock3, X } from "lucide-react";
import type { AchievementStatus } from "@/lib/achievement-engine";

const config = {
  achieved: { label: "ผ่าน", className: "status-achieved", icon: Check },
  not_achieved: { label: "ไม่ผ่าน", className: "status-not-achieved", icon: X },
  pending: { label: "ยังไม่ตัดสิน", className: "status-pending", icon: Clock3 },
};

export default function PloBadge({ status, compact = false }: { status: AchievementStatus; compact?: boolean }) {
  const item = config[status];
  const Icon = item.icon;
  return <Badge className={`status-badge ${item.className} ${compact ? "px-2 py-1" : ""}`}><Icon size={compact ? 12 : 14} />{item.label}</Badge>;
}
