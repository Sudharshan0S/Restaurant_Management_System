import React from "react";

export const Field = ({ id, label, error, hint, ...props }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
    {hint && !error && <small id={`${id}-hint`} className="muted">{hint}</small>}
    {error && <small id={`${id}-err`} className="field__error" role="alert">{error}</small>}
  </div>
);
