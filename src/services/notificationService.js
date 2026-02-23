// src/services/notificationService.js
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// SweetAlert2 configurations (MidTask theme - teal/blue)
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
      color: "#1a365d",
      iconColor: "#0d9488",
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
      color: "#1a365d",
      confirmButtonColor: "#0d9488",
      iconColor: "#dc3545",
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
      color: "#1a365d",
      iconColor: "#ffc107",
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
      confirmButtonColor: "#0d9488",
      background: "#fff",
      color: "#1a365d",
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
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6c757d",
      confirmButtonText,
      cancelButtonText,
      background: "#fff",
      color: "#1a365d",
      iconColor: "#0d9488",
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
      color: "#1a365d",
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  close: () => {
    Swal.close();
  },
};

// Toastify configurations (MidTask theme)
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
        background: "#f0fdfa",
        color: "#0d9488",
        border: "1px solid #99f6e4",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#0d9488",
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
        color: "#dc3545",
        border: "1px solid #f8d7da",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#dc3545",
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
        color: "#856404",
        border: "1px solid #ffeaa7",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#ffc107",
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
        color: "#0d9488",
        border: "1px solid #ccfbf1",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#0d9488",
      },
    });
  },
};

export { ToastContainer } from "react-toastify";
