import "./FilterChip.css";

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  isDashed?: boolean;
  onClick: () => void;
}

export function FilterChip({ label, isSelected, isDashed, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-chip ${isSelected ? "filter-chip--selected" : ""} ${
        isDashed ? "filter-chip--dashed" : ""
      }`}
    >
      {label}
    </button>
  );
}
