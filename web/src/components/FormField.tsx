import type { ReactNode } from "react";
import "./FormField.css";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-field">
      <span className="form-field__label">{label}</span>
      {children}
    </div>
  );
}
