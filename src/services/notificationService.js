// src/services/notificationService.js
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Use root colors from index.css (--primary-blue, --sidebar-text, --reject-red, etc.)
const ROOT = {
  primary: "#0b558f",       // --primary-blue
  primaryDark: "#094a75",   // --primary-blue-dark
  text: "#1e3a5f",         // --sidebar-text
  textMuted: "#4a5568",    // --footer-text
  cancel: "#6c757d",
  danger: "#b91c1c",       // --reject-red
  success: "#16a34a",       // --success-green
  warning: "#856404",
};

// SweetAlert2 configurations (aligned with index.css — corporate / government)
export const showAlert = {
  success: (title, text = "", timer = 3000) => {
    return Swal.fire({
      title,
      text,
      icon: "success",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: ROOT.text,
      iconColor: ROOT.success,
    });
  },

  error: (title, text = "", timer = 4000) => {
    return Swal.fire({
      title,
      text,
      icon: "error",
      timer,
      timerProgressBar: true,
      background: "#fff",
      color: ROOT.text,
      confirmButtonColor: ROOT.primary,
      iconColor: ROOT.danger,
    });
  },

  warning: (title, text = "", timer = 3000) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: ROOT.text,
      iconColor: ROOT.warning,
    });
  },

  info: (
    title,
    htmlContent = "",
    confirmButtonText = "Close",
    timer = null,
    showCloseButton = true
  ) => {
    return Swal.fire({
      title,
      html: htmlContent,
      icon: null,
      timer: timer,
      timerProgressBar: !!timer,
      showConfirmButton: true,
      confirmButtonText,
      confirmButtonColor: ROOT.primary,
      background: "#fff",
      color: ROOT.text,
      width: "450px",
      maxWidth: "95vw",
      padding: "1rem",
      backdrop: true,
      showCloseButton: showCloseButton,
      closeButtonHtml: "&times;",
      customClass: {
        container: "swal2-high-zindex",
        popup: "swal2-avatar-popup",
        title: "swal2-avatar-title",
        htmlContainer: "swal2-avatar-html",
        closeButton: "swal2-close-top",
      },
      didOpen: () => {
        const container = document.querySelector(".swal2-container");
        const popup = document.querySelector(".swal2-popup");
        if (container) container.style.zIndex = "99999";
        if (popup) popup.style.zIndex = "100000";
      },
    });
  },

  confirm: (
    title,
    text = "",
    confirmButtonText = "Yes",
    cancelButtonText = "Cancel"
  ) => {
    return Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: ROOT.primary,
      cancelButtonColor: ROOT.cancel,
      confirmButtonText,
      cancelButtonText,
      background: "#fff",
      color: ROOT.text,
      iconColor: ROOT.primary,
    });
  },

  loading: (title = "Loading...") => {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      background: "#fff",
      color: ROOT.text,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  loadingWithOverlay: (title = "Loading...") => {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      background: "#fff",
      color: ROOT.text,
      backdrop: "rgba(0,0,0,0.25)",
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  close: () => {
    Swal.close();
  },
};

// Toastify configurations (aligned with index.css — primary-blue, corporate / government)
export const showToast = {
  success: (message, autoClose = 3000) => {
    toast.success(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f0f9ff",
        color: ROOT.primary,
        border: "1px solid rgba(11, 85, 143, 0.25)",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: ROOT.primary,
      },
    });
  },

  error: (message, autoClose = 4000) => {
    toast.error(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fff5f5",
        color: ROOT.danger,
        border: "1px solid rgba(185, 28, 28, 0.2)",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: ROOT.danger,
      },
    });
  },

  warning: (message, autoClose = 3000) => {
    toast.warn(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fffbf0",
        color: ROOT.warning,
        border: "1px solid rgba(245, 158, 11, 0.3)",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#eab308",
      },
    });
  },

  info: (message, autoClose = 3000) => {
    toast.info(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f0f9ff",
        color: ROOT.primary,
        border: "1px solid rgba(11, 85, 143, 0.2)",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: ROOT.primary,
      },
    });
  },
};

export { ToastContainer } from "react-toastify";
