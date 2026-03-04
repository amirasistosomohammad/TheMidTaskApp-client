import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Logout confirmation modal – portal-based, same structure/UX as TasDoneNa (reference).
 * Renders into document.body with backdrop + content animations.
 * When isLoading is true, the primary button shows a corporate-style spinner and actions are disabled.
 */
const LogoutConfirmModal = ({ show, isLoading = false, onConfirm, onCancel }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onCancel?.();
    }, 200);
  }, [onCancel, isLoading]);

  const handleConfirm = useCallback(() => {
    if (isLoading) return;
    onConfirm?.();
  }, [onConfirm, isLoading]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && !isLoading) handleClose();
    },
    [handleClose, isLoading]
  );

  useEffect(() => {
    if (!show) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show, handleKeyDown]);

  if (!show) return null;

  const modalContent = (
    <div className="portal-logout-overlay" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle">
      <div
        className={`portal-logout-backdrop modal-backdrop-animation ${closing ? "exit" : ""}`}
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Enter" && handleClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="portal-logout-wrap">
        <div
          className={`portal-logout-box modal-content-animation ${closing ? "exit" : ""}`}
          role="document"
        >
          <div className="portal-logout-header">
            <div>
              <h2 className="portal-logout-title" id="logoutModalTitle">
                Sign out?
              </h2>
              <p className="portal-logout-subtitle">Confirm sign out from your account</p>
            </div>
            <button
              type="button"
              className="portal-logout-close"
              aria-label="Close"
              onClick={handleClose}
            >
              ×
            </button>
          </div>
          <div className="portal-logout-body">
            Are you sure you want to sign out? You will need to sign in again to access MID-TASK APP.
          </div>
          <div className="portal-logout-footer">
            <button
              type="button"
              className="btn portal-logout-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn logout-confirm-signout-btn"
              onClick={handleConfirm}
              disabled={isLoading}
              aria-busy={isLoading}
              aria-live="polite"
            >
              {isLoading ? (
                <>
                  <span className="portal-logout-spinner" aria-hidden="true" />
                  <span className="portal-logout-btn-text">Signing out…</span>
                </>
              ) : (
                "Yes, sign out"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LogoutConfirmModal;
