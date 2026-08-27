/** Clinical Aurora: the shared evidence spine makes each screen a connected step in the traceable path from source data to accountable decisions. */
import { ArrowRight } from "lucide-react";

export default function EvidenceSpine({ items, active = 0 }: { items: Array<{ label: string; detail: string }>; active?: number }) {
  return <nav className="evidence-spine" aria-label="เส้นทางหลักฐาน">
    <span className="spine-label">EVIDENCE PATH</span>
    <div className="spine-steps">{items.map((item, index) => <div key={item.label} className={`spine-step ${index === active ? "active" : ""}`}><span className="spine-node">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div>{index < items.length - 1 && <ArrowRight className="spine-arrow" size={14} />}</div>)}</div>
  </nav>;
}
