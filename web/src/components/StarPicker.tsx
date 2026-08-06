import "./StarPicker.css";

interface StarPickerProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Cleanliness rating">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`star-picker__star ${star <= value ? "star-picker__star--filled" : ""}`}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
