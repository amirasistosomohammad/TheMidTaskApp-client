import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { FaBars, FaUser, FaCaretDown, FaSignOutAlt, FaCog } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { getHomePathForUser } from "../utils/authRouting";
import Logo from "../assets/images/logo.png";

const Topbar = ({ onToggleSidebar, appName, logoUrl, settingsLoading }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserMenuClosing, setIsUserMenuClosing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, left: undefined, maxWidth: 320 });
  const closeTimerRef = useRef(null);

  const closeUserMenu = useCallback(() => {
    if (!isUserMenuOpen || isUserMenuClosing) return;
    setIsUserMenuClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsUserMenuClosing(false);
      setIsUserMenuOpen(false);
    }, 180);
  }, [isUserMenuOpen, isUserMenuClosing]);

  const openUserMenu = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setIsUserMenuClosing(false);
    setIsUserMenuOpen(true);
  }, []);

  const toggleUserMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (isUserMenuOpen) closeUserMenu();
      else openUserMenu();
    },
    [isUserMenuOpen, closeUserMenu, openUserMenu]
  );

  useEffect(() => {
    if (!isUserMenuOpen || !triggerRef.current) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const padding = 12;
      const isMobile = window.innerWidth <= 576;
      if (isMobile) {
        setDropdownPosition({
          top: rect.bottom + 4,
          right: padding,
          left: undefined,
          maxWidth: window.innerWidth - padding * 2,
        });
      } else {
        const maxW = Math.min(320, window.innerWidth - padding * 2);
        const right = window.innerWidth - rect.right;
        const leftEdge = window.innerWidth - right - maxW;
        setDropdownPosition({
          top: rect.bottom + 4,
          right,
          left: leftEdge < padding ? padding : undefined,
          maxWidth: maxW,
        });
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onPointerDown = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = dropdownRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) closeUserMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeUserMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen, closeUserMenu]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleSignOutClick = () => setShowLogoutConfirm(true);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      closeUserMenu();
      navigate("/login");
    } catch {
      // Keep modal open on error; loading state cleared in finally
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  const canAccessProfile = user?.role === "administrative_officer" || user?.role === "school_head";

  const getRoleDisplay = () => {
    if (!user?.role) return null;
    switch (user.role) {
      case "central_admin":
        return "Central Administrative Officer";
      case "school_head":
        return "School Head";
      case "administrative_officer":
	    return "Personnel";
      default:
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }
  };

  return (
    <>
      <nav className="sb-topnav navbar navbar-expand navbar-light">
        <div className="topbar-brand-wrap navbar-brand d-flex align-items-center flex-shrink-0">
          <Link
            to={getHomePathForUser(user)}
            className="d-flex align-items-center text-decoration-none topbar-brand-link"
          >
            {settingsLoading ? (
              <div className="topbar-brand-skeleton" aria-hidden="true">
                <div className="topbar-brand-logo-skeleton" />
                <div className="topbar-brand-text-skeleton" />
              </div>
            ) : (
              <div className="topbar-brand-content">
                <img
                  src={logoUrl || Logo}
                  alt={appName || "MID-TASK APP"}
                  className="topbar-icon-logo me-2"
                  aria-hidden="true"
                />
                <span className="topbar-brand-text">
                  {appName || "MID-TASK APP"}
                </span>
              </div>
            )}
          </Link>
        </div>

        <button
          type="button"
          className="btn btn-link btn-sm flex-shrink-0 order-1 order-lg-0 me-2 me-lg-0"
          id="sidebarToggle"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <FaBars size={14} className="text-dark" style={{ verticalAlign: "middle" }} />
        </button>

        <div className="topbar-user-wrap d-flex align-items-center ms-auto min-width-0">
          <button
            ref={triggerRef}
            type="button"
            className="topbar-user-btn d-flex align-items-center border-0 bg-transparent p-0"
            id="navbarDropdown"
            role="button"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            onClick={toggleUserMenu}
          >
              <div className="position-relative me-2">
                <div
                  className="bg-light rounded-circle d-flex align-items-center justify-content-center topbar-user-avatar"
                  style={{ width: "32px", height: "32px" }}
                >
                  <FaUser size={14} className="text-dark" />
                </div>
              </div>
              <span className="topbar-account-name-text text-dark fw-semibold me-1">
                {user?.name || "User"}
              </span>
              <FaCaretDown
                size={18}
                className="topbar-dropdown-caret flex-shrink-0"
                style={{
                  transform: isUserMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>
        </nav>

      {(isUserMenuOpen || isUserMenuClosing) &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`topbar-dropdown-panel user-dropdown-menu user-dropdown-portal-menu ${isUserMenuOpen && !isUserMenuClosing ? "is-open" : "is-closing"}`}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              left: dropdownPosition.left,
              maxWidth: dropdownPosition.maxWidth,
              minWidth: 300,
            }}
          >
            <div className="topbar-dropdown-header">
              <strong className="topbar-dropdown-user-name">{user?.name || "User"}</strong>
              {user?.email && (
                <span className="topbar-dropdown-user-email">{user.email}</span>
              )}
              {getRoleDisplay() && (
                <span className="topbar-dropdown-user-role">{getRoleDisplay()}</span>
              )}
            </div>
            <div className="topbar-dropdown-divider" />
            {canAccessProfile && (
              <Link
                to="/profile"
                className="topbar-dropdown-item"
                onClick={closeUserMenu}
              >
                <FaCog size={14} className="me-2" />
                Profile
              </Link>
            )}
            <button
              type="button"
              className="topbar-dropdown-logout"
              onClick={handleSignOutClick}
            >
              <FaSignOutAlt size={14} className="me-2" />
              Logout
            </button>
          </div>,
          document.body
        )}

      <LogoutConfirmModal
        show={showLogoutConfirm}
        isLoading={isLoggingOut}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
};

export default Topbar;
