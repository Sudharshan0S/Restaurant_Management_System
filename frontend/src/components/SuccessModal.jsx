import React, { useEffect, useRef } from "react";

// Reusable confirmation dialog (orders + reservations). Animated checkmark, Esc/overlay to close.
const SuccessModal = ({ title, message, details = [], notices = [], buttonText = "Continue", onClose }) => {
  const btn = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    btn.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <svg className="check" viewBox="0 0 52 52" aria-hidden="true">
          <circle className="check__circle" cx="26" cy="26" r="24" fill="none" />
          <path className="check__tick" fill="none" d="M14 27l8 8 16-17" />
        </svg>
        <h2 id="modal-title">{title}</h2>
        <p>{message}</p>
        {details.length > 0 && (
          <dl className="modal__details">
            {details.map((d) => (<div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>))}
          </dl>
        )}
        {notices.map((n, i) => (<p key={i} className={`notice notice--${n.tone}`}>{n.text}</p>))}
        <button ref={btn} className="btn btn--primary" onClick={onClose}>{buttonText}</button>
      </div>
    </div>
  );
};

export default SuccessModal;
