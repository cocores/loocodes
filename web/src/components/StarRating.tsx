import "./StarRating.css";

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="star-rating" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i + 1;
        const isHalf = rating < filled && rating >= filled - 0.5;
        return (
          <span
            key={i}
            className={`star-rating__star ${rating >= filled ? "star-rating__star--full" : ""} ${
              isHalf ? "star-rating__star--half" : ""
            }`}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
