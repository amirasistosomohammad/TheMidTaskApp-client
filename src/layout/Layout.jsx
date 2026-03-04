import React, { useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../services/apiClient";

/**
 * Main app layout for authenticated routes (TasDoneNa-style).
 * Sidebar toggle and content area with Outlet.
 */
const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(null);

  useEffect(() => {
    if (user?.role !== "central_admin") {
      setPendingApprovalsCount(0);
      return;
    }
    let cancelled = false;
    apiRequest("/admin/pending-users", { auth: true })
      .then((data) => {
        if (!cancelled) setPendingApprovalsCount((data?.users || []).length);
      })
      .catch(() => {
        if (!cancelled) setPendingApprovalsCount(0);
      });
    const handler = (e) => {
      if (e.detail?.count !== undefined && !cancelled) setPendingApprovalsCount(e.detail.count);
    };
    window.addEventListener("account-approvals-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("account-approvals-updated", handler);
    };
  }, [user?.role]);

  useEffect(() => {
    const body = document.body;
    if (sidebarOpen) {
      body.classList.add("sb-sidenav-toggled");
    } else {
      body.classList.remove("sb-sidenav-toggled");
    }
    return () => body.classList.remove("sb-sidenav-toggled");
  }, [sidebarOpen]);

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const handleMainClick = () => {
    if (isMobile && sidebarOpen) handleCloseSidebar();
  };

  return (
    <div className="sb-nav-fixed">
      <Topbar onToggleSidebar={handleToggleSidebar} />
      <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
          <Sidebar
            onCloseSidebar={handleCloseSidebar}
            pendingApprovalsCount={pendingApprovalsCount}
          />
        </div>
        <div id="layoutSidenav_content" onClick={handleMainClick}>
          {isMobile && sidebarOpen && (
            <div
              className="sb-sidenav-overlay"
              aria-hidden="true"
              onClick={handleCloseSidebar}
              onKeyDown={(e) => e.key === "Escape" && handleCloseSidebar()}
              role="button"
              tabIndex={-1}
            />
          )}
          <main>
            <div className="container-fluid px-4">
              <Outlet key={location.pathname} />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
