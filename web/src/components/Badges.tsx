import { bathroomType, type BathroomTypeId } from "../types";
import "./Badges.css";

export function TypeBadge({ type }: { type: BathroomTypeId }) {
  const info = bathroomType(type);
  return (
    <span className="badge badge--neutral">
      {info.emoji} {info.label}
    </span>
  );
}

export function CodeBadge({ code, isFreeNoCode }: { code: string; isFreeNoCode: boolean }) {
  return <span className="badge badge--code">{isFreeNoCode ? "FREE" : code}</span>;
}

export function ADABadge() {
  return <span className="badge badge--green">♿ ADA</span>;
}

export function PriceBadge({ isFree, feeAmount }: { isFree: boolean; feeAmount: string }) {
  return (
    <span className={`badge ${isFree ? "badge--green" : "badge--orange"}`}>
      {isFree ? "🆓 Free" : feeAmount ? `💰 ${feeAmount}` : "💰 Paid"}
    </span>
  );
}

export function DistanceBadge({ text }: { text: string }) {
  return <span className="badge badge--muted">{text}</span>;
}
