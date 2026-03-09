import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FaUserGraduate,
  FaUserPlus,
  FaSpinner,
  FaInbox,
  FaSync,
  FaEye,
  FaSearch,
  FaCopy,
  FaCheck,
  FaKey,
  FaBan,
  FaUserCheck,
  FaUserTimes,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaClipboardList,
  FaUserSlash,
  FaTrash,
  FaEyeSlash,
} from "react-icons/fa";
import { apiRequest, apiRequestFormData, normalizeLogoUrl } from "../../services/apiClient";
import { showToast } from "../../services/notificationService";
import SearchableAoSelect from "../../components/SearchableAoSelect";
import "./AccountApprovals.css";
import "./PersonnelDirectory.css";
import "./SchoolHeadAccounts.css";

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusLabel(status) {
  if (!status) return "—";
  switch (status) {
    case "active": return "Active";
    case "rejected": return "Rejected";
    case "inactive": return "Inactive";
    default: return status.replace(/_/g, " ");
  }
}

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function formatCountFull(n) {
  return (Number(n) || 0).toLocaleString();
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
}

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pwd = "";
  pwd += chars[Math.floor(Math.random() * 26)];
  pwd += chars[26 + Math.floor(Math.random() * 10)];
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

const PER_PAGE_OPTIONS = [5, 10, 25, 50];
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
];

export default function SchoolHeadAccounts() {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsUser, setDetailsUser] = useState(null);
  const [detailsAssignments, setDetailsAssignments] = useState({
    loading: false,
    items: [],
    error: null,
  });
  const [availableAos, setAvailableAos] = useState([]);
  const [availableAosLoading, setAvailableAosLoading] = useState(false);
  const [selectedAoId, setSelectedAoId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [detailsModalClosing, setDetailsModalClosing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalClosing, setAddModalClosing] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    employee_id: "",
    position: "",
    division: "",
    school_name: "",
  });
  const [addErrors, setAddErrors] = useState({});
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showAddDiscardConfirm, setShowAddDiscardConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [addModalAosToAssign, setAddModalAosToAssign] = useState([]);
  const [addModalSelectedAoId, setAddModalSelectedAoId] = useState("");
  const [addModalAosLoading, setAddModalAosLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kpiModalStat, setKpiModalStat] = useState(null);
  const [kpiModalClosing, setKpiModalClosing] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState(null);
  const [deactivateModalClosing, setDeactivateModalClosing] = useState(false);
  const [deactivateRemarks, setDeactivateRemarks] = useState("");
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [activateUser, setActivateUser] = useState(null);
  const [activateModalClosing, setActivateModalClosing] = useState(false);
  const [activateRemarks, setActivateRemarks] = useState("");
  const [activateSubmitting, setActivateSubmitting] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteModalClosing, setDeleteModalClosing] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const schoolHeads = personnel;

  const filteredUsers = useMemo(() => {
    let list = schoolHeads;
    if (statusFilter !== "all") {
      list = list.filter((u) => u.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const empId = (u.employee_id || "").toLowerCase();
      const position = (u.position || "").toLowerCase();
      const division = (u.division || "").toLowerCase();
      const school = (u.school_name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || empId.includes(q) || position.includes(q) || division.includes(q) || school.includes(q);
    });
  }, [schoolHeads, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: schoolHeads.length,
    approved: schoolHeads.filter((u) => u.status === "active").length,
    rejected: schoolHeads.filter((u) => u.status === "rejected").length,
    inactive: schoolHeads.filter((u) => u.status === "inactive").length,
  }), [schoolHeads]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (pageIndex - 1) * perPage + 1;
  const endItem = Math.min(pageIndex * perPage, totalItems);
  const paginatedUsers = filteredUsers.slice((pageIndex - 1) * perPage, pageIndex * perPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/admin/personnel?status=all&role=school_head", { auth: true });
      const list = Array.isArray(data?.personnel) ? data.personnel : [];
      setPersonnel(list);
    } catch (err) {
      showToast.error(err?.message || "Failed to load school head accounts.");
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadAssignmentsForSchoolHead = useCallback(
    async (schoolHeadId) => {
      if (!schoolHeadId) return;
      setDetailsAssignments((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await apiRequest(`/admin/school-heads/${schoolHeadId}/aos`, { auth: true });
        const list = Array.isArray(res?.administrative_officers) ? res.administrative_officers : [];
        setDetailsAssignments({ loading: false, items: list, error: null });
      } catch (err) {
        setDetailsAssignments({ loading: false, items: [], error: err?.message || "Failed to load assignments." });
      }
    },
    []
  );

  const loadAvailableAos = useCallback(async () => {
    setAvailableAosLoading(true);
    try {
      const res = await apiRequest("/admin/personnel?status=active&role=administrative_officer", { auth: true });
      const list = Array.isArray(res?.personnel) ? res.personnel : [];
      setAvailableAos(list);
    } catch (err) {
      showToast.error(err?.message || "Failed to load Administrative Officers.");
      setAvailableAos([]);
    } finally {
      setAvailableAosLoading(false);
    }
  }, []);

  const loadAvailableAosForAddModal = useCallback(async () => {
    setAddModalAosLoading(true);
    try {
      const res = await apiRequest("/admin/personnel?status=active&role=administrative_officer", { auth: true });
      const list = Array.isArray(res?.personnel) ? res.personnel : [];
      setAvailableAos(list);
    } catch (err) {
      showToast.error(err?.message || "Failed to load Administrative Officers.");
      setAvailableAos([]);
    } finally {
      setAddModalAosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      loadAvailableAosForAddModal();
    }
  }, [addModalOpen, loadAvailableAosForAddModal]);

  const handleOpenDetails = useCallback(
    (user) => {
      if (!user) return;
      setDetailsUser(user);
      setSelectedAoId("");
      loadAssignmentsForSchoolHead(user.id);
      loadAvailableAos();
    },
    [loadAssignmentsForSchoolHead, loadAvailableAos]
  );

  const handleCloseDetails = useCallback(() => {
    setDetailsModalClosing(true);
    setTimeout(() => {
      setDetailsModalClosing(false);
      setDetailsUser(null);
      setDetailsAssignments({ loading: false, items: [], error: null });
      setSelectedAoId("");
    }, 200);
  }, []);

  const handleAssignAo = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!detailsUser || !selectedAoId) return;
      setAssignSubmitting(true);
      try {
        const res = await apiRequest(`/admin/school-heads/${detailsUser.id}/aos`, {
          method: "POST",
          auth: true,
          body: { ao_id: Number(selectedAoId) },
        });
        const list = Array.isArray(res?.administrative_officers) ? res.administrative_officers : [];
        setDetailsAssignments({ loading: false, items: list, error: null });
        showToast.success("Administrative Officer assigned successfully.");
        setSelectedAoId("");
      } catch (err) {
        showToast.error(err?.message || "Failed to assign Administrative Officer.");
      } finally {
        setAssignSubmitting(false);
      }
    },
    [detailsUser, selectedAoId]
  );

  const handleRemoveAo = useCallback(
    async (aoId) => {
      if (!detailsUser || !aoId) return;
      try {
        await apiRequest(`/admin/school-heads/${detailsUser.id}/aos/${aoId}`, {
          method: "DELETE",
          auth: true,
        });
        // Refresh assignments list after removal.
        loadAssignmentsForSchoolHead(detailsUser.id);
        showToast.success("Assignment removed.");
      } catch (err) {
        showToast.error(err?.message || "Failed to remove assignment.");
      }
    },
    [detailsUser, loadAssignmentsForSchoolHead]
  );

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };
    setPasswordValidation(validation);
    return validation;
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      if (value.length > 0) setShowPasswordCriteria(true);
      validatePassword(value);
    } else if (addErrors[name]) {
      setAddErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleAddBlur = (e) => {
    const { name, value } = e.target;
    if (["name", "email"].includes(name)) validateField(name, value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (addErrors.avatar) setAddErrors((prev) => ({ ...prev, avatar: null }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAddErrors((prev) => ({ ...prev, avatar: "Image must be 2MB or less." }));
      return;
    }
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      setAddErrors((prev) => ({ ...prev, avatar: "Use JPEG, PNG, GIF, or WebP." }));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (addErrors.avatar) setAddErrors((prev) => ({ ...prev, avatar: null }));
  };

  const clearAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAddErrors((prev) => (prev.avatar ? { ...prev, avatar: null } : prev));
  }, []);

  const isAddDirty = useMemo(() => {
    const f = addForm || {};
    const hasText =
      !!(f.name || "").trim() ||
      !!(f.email || "").trim() ||
      !!(f.password || "").trim() ||
      !!(f.employee_id || "").trim() ||
      !!(f.position || "").trim() ||
      !!(f.division || "").trim() ||
      !!(f.school_name || "").trim();
    return hasText || !!avatarFile || addModalAosToAssign.length > 0;
  }, [addForm, avatarFile, addModalAosToAssign.length]);

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setAddForm((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
    setShowPasswordCriteria(true);
    validatePassword(pwd);
  };

  const validateAdd = () => {
    const next = {};
    if (!addForm.name?.trim()) next.name = "Full name is required.";
    if (!addForm.email?.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) next.email = "Enter a valid institutional email address.";
    if (!addForm.password) next.password = "Password is required.";
    else if (addForm.password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(addForm.password) || !/[0-9]/.test(addForm.password)) {
      next.password = "Password must include at least one letter and one number.";
    }
    if (addModalAosToAssign.length === 0) next.assignments = "At least one Administrative Officer must be assigned.";
    if (avatarFile && avatarFile.size > 2 * 1024 * 1024) next.avatar = "Image must be 2MB or less.";
    if (avatarFile && !/^image\/(jpeg|jpg|png|gif|webp)$/i.test(avatarFile.type)) next.avatar = "Use JPEG, PNG, GIF, or WebP.";
    setAddErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateField = (name, value) => {
    const next = { ...addErrors };
    if (name === "name") {
      if (!value?.trim()) next.name = "Full name is required.";
      else delete next.name;
    } else if (name === "email") {
      if (!value?.trim()) next.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) next.email = "Enter a valid institutional email address.";
      else delete next.email;
    } else if (name === "password") {
      if (!value) next.password = "Password is required.";
      else if (value.length < 8) next.password = "Password must be at least 8 characters.";
      else if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) next.password = "Password must include at least one letter and one number.";
      else delete next.password;
    }
    setAddErrors(next);
  };

  const handleAddSubmitClick = (e) => {
    e.preventDefault();
    if (!validateAdd()) return;
    setShowAddConfirm(true);
  };

  const handleAddConfirmCancel = () => setShowAddConfirm(false);

  const handleAddModalAddAo = (e) => {
    e?.preventDefault();
    if (!addModalSelectedAoId) return;
    const ao = availableAos.find((a) => Number(a.id) === Number(addModalSelectedAoId));
    if (!ao || addModalAosToAssign.some((a) => Number(a.id) === Number(ao.id))) return;
    setAddModalAosToAssign((prev) => [...prev, { id: ao.id, name: ao.name, school_name: ao.school_name ?? "", position: ao.position ?? "" }]);
    setAddModalSelectedAoId("");
    if (addErrors.assignments) setAddErrors((prev) => ({ ...prev, assignments: null }));
  };

  const handleAddModalRemoveAo = (aoId) => {
    setAddModalAosToAssign((prev) => prev.filter((a) => Number(a.id) !== Number(aoId)));
    if (addErrors.assignments) setAddErrors((prev) => ({ ...prev, assignments: null }));
  };

  const handleAddConfirmSubmit = async () => {
    setAddSubmitting(true);
    setCredentials(null);
    try {
      const res = await apiRequest("/admin/users", {
        method: "POST",
        auth: true,
        body: {
          name: addForm.name.trim(),
          email: addForm.email.trim().toLowerCase(),
          password: addForm.password,
          role: "school_head",
          employee_id: addForm.employee_id.trim() || null,
          position: addForm.position.trim() || null,
          division: addForm.division.trim() || null,
          school_name: addForm.school_name.trim() || null,
        },
      });
      const userId = res?.user?.id;
      if (userId && avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await apiRequestFormData(`/admin/users/${userId}/avatar`, { method: "POST", formData: fd, auth: true });
      }
      if (userId && addModalAosToAssign.length > 0) {
        for (const ao of addModalAosToAssign) {
          try {
            await apiRequest(`/admin/school-heads/${userId}/aos`, {
              method: "POST",
              auth: true,
              body: { ao_id: Number(ao.id) },
            });
          } catch (assignErr) {
            showToast.error(assignErr?.message || `Could not assign ${ao.name}. You can assign later from the School Head details.`);
          }
        }
      }
      setShowAddConfirm(false);
      setCredentials(res.credentials || { email: res.user?.email, password: addForm.password });
      showToast.success("School Head account created. Share the credentials with the user.");
      clearAvatar();
      try {
        await fetchData();
      } catch (refreshErr) {
        showToast.warning("Account created. List could not be refreshed.");
      }
    } catch (err) {
      const msg = err?.data?.errors
        ? Object.values(err.data.errors).flat().join(" ")
        : err?.message || "Failed to create account.";
      showToast.error(msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast.success("Credentials copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Could not copy. Please copy manually.");
    }
  };

  const handleCloseAddModal = useCallback(() => {
    setAddModalClosing(true);
    setShowAddConfirm(false);
    setShowAddDiscardConfirm(false);
    clearAvatar();
    setTimeout(() => {
      setAddModalClosing(false);
      setAddModalOpen(false);
      setAddForm({
        name: "",
        email: "",
        password: "",
        employee_id: "",
        position: "",
        division: "",
        school_name: "",
      });
      setAddErrors({});
      setPasswordValidation({ minLength: false, hasLetter: false, hasNumber: false });
      setShowPasswordCriteria(false);
      setCredentials(null);
      setAddModalAosToAssign([]);
      setAddModalSelectedAoId("");
    }, 200);
  }, [clearAvatar]);

  const handleRequestCloseAddModal = useCallback(() => {
    if (addSubmitting) return;
    if (credentials) return handleCloseAddModal(); // safe to close credentials view without warning
    if (!isAddDirty) return handleCloseAddModal();
    setShowAddDiscardConfirm(true);
  }, [addSubmitting, credentials, isAddDirty, handleCloseAddModal]);

  const handleAddDiscardCancel = () => setShowAddDiscardConfirm(false);
  const handleAddDiscardConfirm = () => {
    setShowAddDiscardConfirm(false);
    handleCloseAddModal();
  };

  const handleCloseDeactivate = useCallback(() => {
    setDeactivateModalClosing(true);
    setShowDeactivateConfirm(false);
    setTimeout(() => {
      setDeactivateModalClosing(false);
      setDeactivateUser(null);
      setDeactivateRemarks("");
    }, 200);
  }, []);
  const handleCloseActivate = useCallback(() => {
    setActivateModalClosing(true);
    setShowActivateConfirm(false);
    setTimeout(() => {
      setActivateModalClosing(false);
      setActivateUser(null);
      setActivateRemarks("");
    }, 200);
  }, []);
  const handleCloseDelete = useCallback(() => {
    setDeleteModalClosing(true);
    setShowDeleteConfirm(false);
    setTimeout(() => {
      setDeleteModalClosing(false);
      setDeleteUser(null);
    }, 200);
  }, []);

  useEffect(() => {
    if (!addModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (addSubmitting) return;
      if (showAddDiscardConfirm) handleAddDiscardCancel();
      else if (showAddConfirm) handleAddConfirmCancel();
      else handleRequestCloseAddModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [addModalOpen, showAddConfirm, showAddDiscardConfirm, addSubmitting, handleRequestCloseAddModal]);

  useEffect(() => {
    if (!deactivateUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (deactivateSubmitting) return;
      if (showDeactivateConfirm) handleDeactivateConfirmCancel();
      else handleCloseDeactivate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deactivateUser, deactivateSubmitting, showDeactivateConfirm, handleCloseDeactivate]);

  useEffect(() => {
    if (!activateUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (activateSubmitting) return;
      if (showActivateConfirm) handleActivateConfirmCancel();
      else handleCloseActivate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activateUser, activateSubmitting, showActivateConfirm, handleCloseActivate]);

  useEffect(() => {
    if (!deleteUser) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (deleteSubmitting) return;
      if (showDeleteConfirm) setShowDeleteConfirm(false);
      else handleCloseDelete();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteUser, deleteSubmitting, showDeleteConfirm, handleCloseDelete]);

  useEffect(() => {
    if (!kpiModalStat) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (kpiModalClosing) return;
      setKpiModalClosing(true);
      setTimeout(() => {
        setKpiModalClosing(false);
        setKpiModalStat(null);
      }, 200);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiModalStat, kpiModalClosing]);

  const handleOpenDeactivate = (user) => {
    setDeactivateRemarks("");
    setDeactivateUser(user);
  };
  const handleDeactivateConfirmOpen = () => setShowDeactivateConfirm(true);
  const handleDeactivateConfirmCancel = () => setShowDeactivateConfirm(false);
  const handleDeactivateSubmit = async () => {
    if (!deactivateUser) return;
    setShowDeactivateConfirm(false);
    setDeactivateSubmitting(true);
    try {
      await apiRequest(`/admin/users/${deactivateUser.id}/deactivate`, {
        method: "POST",
        auth: true,
        body: { remarks: deactivateRemarks.trim() || undefined },
      });
      showToast.success(`Account deactivated: ${deactivateUser.name}`);
      handleCloseDeactivate();
      try {
        await fetchData();
      } catch (e) {
        showToast.warning("List could not be refreshed.");
      }
    } catch (err) {
      showToast.error(err?.message || "Failed to deactivate account.");
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  const handleOpenActivate = (user) => {
    setActivateRemarks("");
    setActivateUser(user);
  };
  const handleActivateConfirmOpen = () => setShowActivateConfirm(true);
  const handleActivateConfirmCancel = () => setShowActivateConfirm(false);
  const handleActivateSubmit = async () => {
    if (!activateUser) return;
    setShowActivateConfirm(false);
    setActivateSubmitting(true);
    try {
      await apiRequest(`/admin/users/${activateUser.id}/activate`, {
        method: "POST",
        auth: true,
        body: { remarks: activateRemarks.trim() || undefined },
      });
      showToast.success(`Account activated: ${activateUser.name}`);
      handleCloseActivate();
      try {
        await fetchData();
      } catch (e) {
        showToast.warning("List could not be refreshed.");
      }
    } catch (err) {
      showToast.error(err?.message || "Failed to activate account.");
    } finally {
      setActivateSubmitting(false);
    }
  };

  const handleOpenDelete = (user) => setDeleteUser(user);
  const handleDeleteConfirmOpen = () => setShowDeleteConfirm(true);
  const handleDeleteConfirmCancel = () => setShowDeleteConfirm(false);
  const handleDeleteSubmit = async () => {
    if (!deleteUser) return;
    setShowDeleteConfirm(false);
    setDeleteSubmitting(true);
    try {
      await apiRequest(`/admin/users/${deleteUser.id}`, {
        method: "DELETE",
        auth: true,
      });
      showToast.success(`School Head account deleted: ${deleteUser.name}`);
      handleCloseDelete();
      try {
        await fetchData();
      } catch (e) {
        showToast.warning("List could not be refreshed.");
      }
    } catch (err) {
      showToast.error(err?.message || "Failed to delete account.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="personnel-dir-page page-transition-enter">
      <header className="personnel-dir-header">
        <div className="personnel-dir-header-inner">
          <div className="personnel-dir-header-text">
            <span className="personnel-dir-title-icon" aria-hidden="true">
              <FaUserGraduate />
            </span>
            <div>
              <h1 className="personnel-dir-title">School Head accounts</h1>
              <p className="personnel-dir-subtitle">
                Manage School Head validators. Add accounts and share credentials with them.
              </p>
            </div>
          </div>
          <div className="school-head-accounts-header-actions">
            <button
              type="button"
              className="school-head-accounts-btn-add"
              onClick={() => {
                setAddModalOpen(true);
                setAddModalClosing(false);
                setCredentials(null);
              }}
              aria-label="Add School Head"
              title="Add School Head"
            >
              <FaUserPlus aria-hidden="true" />
              <span>Add School Head</span>
            </button>
            <button
              type="button"
              className="personnel-dir-refresh-btn"
              onClick={() => { setLoading(true); fetchData(); }}
              disabled={loading}
              aria-label="Refresh list"
            >
              {loading ? <FaSpinner className="spinner" aria-hidden="true" /> : <FaSync aria-hidden="true" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Summary KPI cards – Total and Inactive only (School Heads are created by admin, no approval/rejection flow) */}
      {!loading && (
        <div className="personnel-dir-kpi-grid">
          <article className="personnel-dir-kpi-card personnel-dir-kpi-total" role="button" tabIndex={0} onClick={() => setKpiModalStat("total")} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("total"))} aria-label={`Total School Heads: ${formatCountFull(stats.total)}. View full count.`}>
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true"><FaClipboardList className="personnel-dir-kpi-icon" /></div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Total</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.total)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
          <article className="personnel-dir-kpi-card personnel-dir-kpi-inactive" role="button" tabIndex={0} onClick={() => setKpiModalStat("inactive")} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setKpiModalStat("inactive"))} aria-label={`Inactive: ${formatCountFull(stats.inactive)}. View full count.`}>
            <div className="personnel-dir-kpi-icon-wrap" aria-hidden="true"><FaUserSlash className="personnel-dir-kpi-icon" /></div>
            <div className="personnel-dir-kpi-body">
              <p className="personnel-dir-kpi-label">Inactive</p>
              <p className="personnel-dir-kpi-value">{formatCount(stats.inactive)}</p>
              <p className="personnel-dir-kpi-hint">View full count</p>
            </div>
            <FaChevronRight className="personnel-dir-kpi-chevron" aria-hidden="true" />
          </article>
        </div>
      )}

      {/* KPI full count modal – smooth close animation */}
      {kpiModalStat &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-kpi-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="school-head-kpi-modal-title" aria-describedby="school-head-kpi-modal-desc">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation${kpiModalClosing ? " exit" : ""}`}
              onClick={() => {
                if (kpiModalClosing) return;
                setKpiModalClosing(true);
                setTimeout(() => { setKpiModalClosing(false); setKpiModalStat(null); }, 200);
              }}
              onKeyDown={(e) => e.key === "Enter" && !kpiModalClosing && (setKpiModalClosing(true), setTimeout(() => { setKpiModalClosing(false); setKpiModalStat(null); }, 200))}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap personnel-dir-kpi-modal-wrap">
              <div className={`personnel-dir-modal personnel-dir-kpi-modal modal-content-animation${kpiModalClosing ? " exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-kpi-modal-title" className="personnel-dir-modal-title">
                      {kpiModalStat === "total" && "Total School Heads"}
                      {kpiModalStat === "inactive" && "Inactive School Heads"}
                    </h2>
                    <p id="school-head-kpi-modal-desc" className="personnel-dir-modal-subtitle">Full count recorded in the system</p>
                  </div>
                  <button
                    type="button"
                    className="personnel-dir-modal-close"
                    onClick={() => {
                      if (kpiModalClosing) return;
                      setKpiModalClosing(true);
                      setTimeout(() => { setKpiModalClosing(false); setKpiModalStat(null); }, 200);
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-kpi-modal-body">
                  <div className="personnel-dir-kpi-modal-value">
                    {formatCountFull(kpiModalStat === "total" ? stats.total : stats.inactive)}
                  </div>
                  <p className="personnel-dir-kpi-modal-label">
                    {kpiModalStat === "total" && "Total School Head accounts"}
                    {kpiModalStat === "inactive" && "Deactivated School Head accounts"}
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer">
                  <button
                    type="button"
                    className="personnel-dir-btn-close"
                    onClick={() => {
                      if (kpiModalClosing) return;
                      setKpiModalClosing(true);
                      setTimeout(() => { setKpiModalClosing(false); setKpiModalStat(null); }, 200);
                    }}
                  >
                    Close
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {loading ? (
        <div className="personnel-dir-loading">
          <FaSpinner className="spinner" aria-hidden="true" />
          <span>Loading school head accounts…</span>
        </div>
      ) : schoolHeads.length === 0 ? (
        <div className="account-approvals-empty school-head-accounts-empty">
          <FaInbox className="account-approvals-empty-icon" aria-hidden="true" />
          <p className="account-approvals-empty-title">No School Head accounts</p>
          <p className="account-approvals-empty-desc school-head-accounts-empty-desc">
            Add School Head validators to manage MOV submissions. Click &quot;Add School Head&quot; to create an account.
          </p>
          <div className="school-head-accounts-empty-actions">
            <button type="button" className="school-head-accounts-btn-add school-head-accounts-btn-add-empty" onClick={() => setAddModalOpen(true)}>
              <FaUserPlus aria-hidden="true" />
              <span>Add School Head</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="personnel-dir-card">
          <div className="personnel-dir-filter-panel">
            <div className="personnel-dir-filter-row">
              <label htmlFor="school-head-status" className="personnel-dir-filter-label">Status</label>
              <select id="school-head-status" className="personnel-dir-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <label htmlFor="school-head-accounts-search" className="personnel-dir-search-label">Search</label>
              <div className="personnel-dir-search-wrap">
                <span className="personnel-dir-search-icon-wrap"><FaSearch className="personnel-dir-search-icon" aria-hidden="true" /></span>
                <div className="personnel-dir-search-input-wrap">
                  <input
                    id="school-head-accounts-search"
                    type="search"
                    className="personnel-dir-search-input"
                    placeholder="Name, email, employee ID, position…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search school heads"
                  />
                  {searchQuery && (
                    <button type="button" className="personnel-dir-search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search" title="Clear search">×</button>
                  )}
                </div>
              </div>
              {searchQuery && (
                <span className="personnel-dir-results-text">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="personnel-dir-empty-state">
              <FaInbox className="personnel-dir-empty-icon" aria-hidden="true" />
              <p className="personnel-dir-empty-title">No school heads found</p>
              <p className="personnel-dir-empty-text">
                {schoolHeads.length === 0 ? "No School Head accounts in the system." : "No results match your search or filter. Try different keywords or clear the filter."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <button type="button" className="personnel-dir-empty-btn" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="personnel-dir-cards-container">
                <div className="personnel-dir-cards-grid">
                  {paginatedUsers.map((user) => {
                    const isActionDisabled = !!deactivateUser || !!activateUser || !!deleteUser;
                    return (
                      <div key={user.id} className="personnel-dir-card-col">
                        <div
                          className="personnel-dir-personnel-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => !isActionDisabled && handleOpenDetails(user)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && !isActionDisabled) {
                              e.preventDefault();
                              handleOpenDetails(user);
                            }
                          }}
                          aria-label={`View details for ${user.name}`}
                        >
                          <div className="personnel-dir-card-top-strip">
                            {user.avatar_url ? (
                              <img src={normalizeLogoUrl(user.avatar_url) || user.avatar_url} alt="" className="personnel-dir-card-top-img" />
                            ) : (
                              <div className="personnel-dir-card-top-initials" aria-hidden="true">
                                <span className="personnel-dir-avatar-initials">{getInitials(user.name)}</span>
                              </div>
                            )}
                          </div>
                          <div className="personnel-dir-card-actions">
                            <button
                              type="button"
                              className="personnel-dir-card-btn personnel-dir-card-btn-view"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetails(user);
                              }}
                              disabled={isActionDisabled}
                              aria-label={`View ${user.name}`}
                              title="View"
                            >
                              <FaEye aria-hidden="true" />
                            </button>
                            {user.status === "active" && (
                              <button type="button" className="personnel-dir-card-btn personnel-dir-card-btn-deactivate" onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(user); }} disabled={isActionDisabled} aria-label={`Deactivate ${user.name}`} title="Deactivate">
                                <FaBan aria-hidden="true" />
                              </button>
                            )}
                            {user.status === "inactive" && (
                              <button type="button" className="personnel-dir-card-btn personnel-dir-card-btn-activate" onClick={(e) => { e.stopPropagation(); handleOpenActivate(user); }} disabled={isActionDisabled} aria-label={`Activate ${user.name}`} title="Activate">
                                <FaUserCheck aria-hidden="true" />
                              </button>
                            )}
                            <button type="button" className="personnel-dir-card-btn personnel-dir-card-btn-delete" onClick={(e) => { e.stopPropagation(); handleOpenDelete(user); }} disabled={isActionDisabled} aria-label={`Delete ${user.name}`} title="Delete">
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>
                          <div className="personnel-dir-card-body">
                            <div className="personnel-dir-card-name" title={user.name}>{user.name}</div>
                            <div className="personnel-dir-card-email" title={user.email}>{user.email}</div>
                            <div className="personnel-dir-card-divider" />
                            <div className="personnel-dir-card-row">
                              <span className="personnel-dir-card-label">Position</span>
                              <span className="personnel-dir-card-value" title={user.position || "—"}>{user.position || "—"}</span>
                            </div>
                            <div className="personnel-dir-card-row">
                              <span className="personnel-dir-card-label">School</span>
                              <span className="personnel-dir-card-value" title={user.school_name || "—"}>{user.school_name || "—"}</span>
                            </div>
                            <div className="personnel-dir-card-footer">
                              <span className={`personnel-dir-status-badge personnel-dir-status-${user.status}`}>{statusLabel(user.status)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="personnel-dir-table-footer">
                  <div className="personnel-dir-footer-left">
                    <label className="personnel-dir-perpage-label">
                      <span className="personnel-dir-perpage-text">Show</span>
                      <select className="personnel-dir-perpage-select" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} aria-label="Rows per page">
                        {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <span className="personnel-dir-perpage-text">per page</span>
                    </label>
                    <span className="personnel-dir-range">
                      Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong>
                    </span>
                  </div>
                  <nav className="personnel-dir-pagination" aria-label="Table pagination">
                    <div className="personnel-dir-pagination-inner">
                      <button type="button" className="personnel-dir-page-btn" onClick={() => goToPage(1)} disabled={pageIndex <= 1} aria-label="First page">
                        <FaAngleDoubleLeft aria-hidden="true" />
                        <span className="personnel-dir-page-btn-text">First</span>
                      </button>
                      <button type="button" className="personnel-dir-page-btn" onClick={() => goToPage(pageIndex - 1)} disabled={pageIndex <= 1} aria-label="Previous page">
                        <FaChevronLeft aria-hidden="true" />
                        <span className="personnel-dir-page-btn-text">Previous</span>
                      </button>
                      <div className="personnel-dir-page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (pageIndex <= 3) pageNum = i + 1;
                          else if (pageIndex >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = pageIndex - 2 + i;
                          return (
                            <button key={pageNum} type="button" className={`personnel-dir-page-btn personnel-dir-page-num ${pageNum === pageIndex ? "active" : ""}`} onClick={() => goToPage(pageNum)} disabled={pageNum === pageIndex} aria-label={`Page ${pageNum}`} aria-current={pageNum === pageIndex ? "page" : undefined}>
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button type="button" className="personnel-dir-page-btn" onClick={() => goToPage(pageIndex + 1)} disabled={pageIndex >= totalPages} aria-label="Next page">
                        <span className="personnel-dir-page-btn-text">Next</span>
                        <FaChevronRight aria-hidden="true" />
                      </button>
                      <button type="button" className="personnel-dir-page-btn" onClick={() => goToPage(totalPages)} disabled={pageIndex >= totalPages} aria-label="Last page">
                        <span className="personnel-dir-page-btn-text">Last</span>
                        <FaAngleDoubleRight aria-hidden="true" />
                      </button>
                    </div>
                  </nav>
                </footer>
              </div>
            </>
          )}
        </div>
      )}

      {/* View details modal */}
      {detailsUser &&
        createPortal(
          <div className="personnel-dir-overlay" role="dialog" aria-modal="true" aria-labelledby="school-head-details-title" aria-describedby="school-head-details-desc">
            <div className={`personnel-dir-backdrop modal-backdrop-animation ${detailsModalClosing ? "exit" : ""}`} onClick={handleCloseDetails} onKeyDown={(e) => e.key === "Enter" && handleCloseDetails()} role="button" tabIndex={0} aria-label="Close modal" />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal modal-content-animation ${detailsModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-details-title" className="personnel-dir-modal-title">School Head details</h2>
                    <p id="school-head-details-desc" className="personnel-dir-modal-subtitle">
                      {detailsUser.name}
                      {detailsUser.email ? ` · ${detailsUser.email}` : ""}
                    </p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseDetails} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <div className="personnel-dir-details-avatar-section">
                    <div className="personnel-dir-avatar personnel-dir-avatar-lg" aria-hidden="true">
                      {detailsUser.avatar_url ? (
                        <img src={normalizeLogoUrl(detailsUser.avatar_url) || detailsUser.avatar_url} alt="" />
                      ) : (
                        <span className="personnel-dir-avatar-initials">{getInitials(detailsUser.name)}</span>
                      )}
                    </div>
                  </div>
                  <dl className="personnel-dir-details-grid">
                    <div className="personnel-dir-details-row">
                      <dt>Name</dt>
                      <dd>{detailsUser.name || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Email</dt>
                      <dd>{detailsUser.email || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Status</dt>
                      <dd>
                        <span className={`personnel-dir-status-badge personnel-dir-status-${detailsUser.status}`}>
                          {statusLabel(detailsUser.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Employee ID</dt>
                      <dd>{detailsUser.employee_id || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Position</dt>
                      <dd>{detailsUser.position || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Division</dt>
                      <dd>{detailsUser.division || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>School</dt>
                      <dd>{detailsUser.school_name || "—"}</dd>
                    </div>
                    <div className="personnel-dir-details-row">
                      <dt>Date created</dt>
                      <dd>{formatDateTime(detailsUser.created_at)}</dd>
                    </div>
                  </dl>

                  {/* Status information & remarks (same as Personnel Directory) */}
                  {(detailsUser.status === "active" || detailsUser.status === "rejected" || detailsUser.status === "inactive") && (
                    <div className={`personnel-dir-details-remarks-block personnel-dir-details-remarks-${detailsUser.status}`}>
                      <h3 className="personnel-dir-details-remarks-title">Status information</h3>
                      {detailsUser.status === "active" && (
                        <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                          <span className="personnel-dir-details-remarks-label">Remarks</span>
                          <span className="personnel-dir-details-remarks-value">
                            {detailsUser.approved_remarks || "No remarks on file."}
                          </span>
                        </div>
                      )}
                      {detailsUser.status === "rejected" && (
                        <>
                          {detailsUser.rejected_at && (
                            <div className="personnel-dir-details-remarks-row">
                              <span className="personnel-dir-details-remarks-label">Rejected on</span>
                              <span className="personnel-dir-details-remarks-value">{formatDateTime(detailsUser.rejected_at)}</span>
                            </div>
                          )}
                          <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                            <span className="personnel-dir-details-remarks-label">Remarks</span>
                            <span className="personnel-dir-details-remarks-value">
                              {detailsUser.rejection_remarks || "No remarks on file."}
                            </span>
                          </div>
                        </>
                      )}
                      {detailsUser.status === "inactive" && (
                        <div className="personnel-dir-details-remarks-row personnel-dir-details-remarks-full">
                          <span className="personnel-dir-details-remarks-label">Deactivation remarks</span>
                          <span className="personnel-dir-details-remarks-value">
                            {detailsUser.approved_remarks || "No remarks on file."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <section className="school-head-accounts-assignments-section">
                    <h3 className="school-head-accounts-assignments-title">Assigned Administrative Officers</h3>
                    {detailsAssignments.loading ? (
                      <div className="school-head-accounts-assignments-loading">
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Loading assignments…</span>
                      </div>
                    ) : detailsAssignments.error ? (
                      <p className="school-head-accounts-assignments-error">
                        {detailsAssignments.error}
                      </p>
                    ) : (
                      <>
                        {detailsAssignments.items.length === 0 ? (
                          <p className="school-head-accounts-assignments-empty">
                            No Administrative Officers are currently assigned to this School Head.
                          </p>
                        ) : (
                          <ul className="school-head-accounts-assignments-list">
                            {detailsAssignments.items.map((ao) => (
                              <li key={ao.id} className="school-head-accounts-assignments-item">
                                <div className="school-head-accounts-name-cell">
                                  <div className="school-head-accounts-avatar" aria-hidden="true">
                                    <div className="school-head-accounts-avatar-placeholder">
                                      {getInitials(ao.name)}
                                    </div>
                                  </div>
                                  <div className="school-head-accounts-assignments-text">
                                    <div className="school-head-accounts-assignments-name" title={ao.name}>
                                      {ao.name}
                                    </div>
                                    <div className="school-head-accounts-assignments-meta">
                                      <span title={ao.school_name || "—"}>
                                        {ao.school_name || "—"}
                                      </span>
                                      {ao.position && (
                                        <>
                                          <span aria-hidden="true"> · </span>
                                          <span title={ao.position}>{ao.position}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="school-head-accounts-assignments-remove"
                                  onClick={() => handleRemoveAo(ao.id)}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form
                          className="school-head-accounts-assignments-form"
                          onSubmit={handleAssignAo}
                        >
                          <label className="school-head-accounts-assignments-label">
                            <span>Assign Administrative Officer</span>
                            <div className="school-head-accounts-assignments-select-row">
                              <SearchableAoSelect
                                options={availableAos}
                                value={selectedAoId}
                                onChange={setSelectedAoId}
                                loading={availableAosLoading}
                                disabled={assignSubmitting}
                                placeholder="Search by name or school..."
                                aria-label="Select Administrative Officer"
                              />
                              <button
                                type="submit"
                                className="school-head-accounts-assignments-add-btn"
                                disabled={!selectedAoId || assignSubmitting}
                              >
                                {assignSubmitting ? (
                                  <>
                                    <FaSpinner className="spinner" aria-hidden="true" />
                                    <span>Assigning…</span>
                                  </>
                                ) : (
                                  <>
                                    <FaUserGraduate aria-hidden="true" />
                                    <span>Assign AO</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </label>
                        </form>
                      </>
                    )}
                  </section>

                  <dl className="personnel-dir-details-grid personnel-dir-details-grid-footer">
                    <div className="personnel-dir-details-row">
                      <dt>Last updated</dt>
                      <dd>{formatDateTime(detailsUser.updated_at || detailsUser.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                <footer className="personnel-dir-modal-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDetails}>Close</button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add School Head modal */}
      {addModalOpen &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-action-overlay school-head-add-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-head-add-title"
          >
            <div
              className={`account-approvals-details-backdrop modal-backdrop-animation ${addModalClosing ? "exit" : ""}`}
              onClick={handleRequestCloseAddModal}
              onKeyDown={(e) => e.key === "Enter" && handleRequestCloseAddModal()}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="account-approvals-details-wrap school-head-add-modal-wrap">
              <div className={`account-approvals-details-modal account-approvals-action-modal school-head-add-modal modal-content-animation ${addModalClosing ? "exit" : ""}`}>
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="school-head-add-title" className="account-approvals-details-title">
                      Add School Head
                    </h2>
                    <p className="account-approvals-details-subtitle">
                      Create an account for a School Head validator. Share the credentials with them securely.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-approvals-details-close"
                    onClick={handleRequestCloseAddModal}
                    disabled={addSubmitting}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {credentials ? (
                  <div className="account-approvals-details-body school-head-add-credentials-body">
                    <div className="school-head-add-credentials-scroll">
                      <p className="account-approvals-remarks-hint" style={{ marginBottom: "1rem" }}>
                        Account created. Share these credentials with the user.
                      </p>
                      <div className="school-head-add-credentials-box">
                        <div style={{ marginBottom: "0.5rem" }}>
                          <strong>Email:</strong> <code style={{ wordBreak: "break-all" }}>{credentials.email}</code>
                        </div>
                        <div>
                          <strong>Password:</strong> <code>{credentials.password}</code>
                        </div>
                      </div>
                    </div>
                    <div className="account-approvals-action-footer">
                      <button
                        type="button"
                        className="account-approvals-btn-approve-modal"
                        onClick={handleCopyCredentials}
                      >
                        {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
                        <span>{copied ? "Copied!" : "Copy credentials"}</span>
                      </button>
                      <button
                        type="button"
                        className="account-approvals-details-btn-close"
                        onClick={handleCloseAddModal}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddSubmitClick} className="account-approvals-details-body school-head-add-form">
                    <div className="school-head-add-form-fields">
                      <div className="school-head-add-avatar-section">
                        <label className="account-approvals-remarks-label">Profile photo <span style={{ color: "var(--footer-text)", fontWeight: 500 }}>(optional)</span></label>
                        <div className="school-head-add-avatar-wrap">
                          <div className="school-head-add-avatar-preview">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Preview" />
                            ) : (
                              <span className="school-head-add-avatar-placeholder"><FaUserGraduate aria-hidden="true" /></span>
                            )}
                          </div>
                          <div className="school-head-add-avatar-actions">
                            <input
                              id="sh-add-avatar"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={handleAvatarChange}
                              disabled={addSubmitting}
                              className="school-head-add-avatar-input"
                            />
                            <label htmlFor="sh-add-avatar" className="school-head-add-avatar-btn">
                              {avatarFile ? "Change photo" : "Upload photo"}
                            </label>
                            {avatarFile && (
                              <button type="button" className="school-head-add-avatar-remove" onClick={clearAvatar} disabled={addSubmitting}>
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={`school-head-add-field-error-wrapper ${addErrors.avatar ? "school-head-add-field-error-visible" : ""}`}>
                          <div className="school-head-add-field-error-inner">
                            <p className="school-head-add-field-error-msg">{addErrors.avatar}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="sh-add-name" className="account-approvals-remarks-label">Full name <span style={{ color: "var(--reject-red)" }}>*</span></label>
                        <input
                          id="sh-add-name"
                          name="name"
                          type="text"
                          value={addForm.name}
                          onChange={handleAddChange}
                          onBlur={handleAddBlur}
                          placeholder="Full name"
                          className={`account-approvals-remarks-textarea ${addErrors.name ? "school-head-add-input-error" : ""}`}
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                        <div className={`school-head-add-field-error-wrapper ${addErrors.name ? "school-head-add-field-error-visible" : ""}`}>
                          <div className="school-head-add-field-error-inner">
                            <p className="school-head-add-field-error-msg">{addErrors.name}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="sh-add-email" className="account-approvals-remarks-label">Email <span style={{ color: "var(--reject-red)" }}>*</span></label>
                        <input
                          id="sh-add-email"
                          name="email"
                          type="email"
                          value={addForm.email}
                          onChange={handleAddChange}
                          onBlur={handleAddBlur}
                          placeholder="Institutional email (e.g. name@deped.gov.ph)"
                          className={`account-approvals-remarks-textarea ${addErrors.email ? "school-head-add-input-error" : ""}`}
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                        <div className={`school-head-add-field-error-wrapper ${addErrors.email ? "school-head-add-field-error-visible" : ""}`}>
                          <div className="school-head-add-field-error-inner">
                            <p className="school-head-add-field-error-msg">{addErrors.email}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="sh-add-password" className="account-approvals-remarks-label">
                          Temporary password <span style={{ color: "var(--reject-red)" }}>*</span>
                        </label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <div className="position-relative flex-grow-1">
                            <input
                              id="sh-add-password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              value={addForm.password}
                              onChange={handleAddChange}
                              onBlur={handleAddBlur}
                              onFocus={() => setShowPasswordCriteria(true)}
                              placeholder="Create a password"
                              className={`account-approvals-remarks-textarea ${addForm.password && !(passwordValidation.minLength && passwordValidation.hasLetter && passwordValidation.hasNumber) ? "school-head-add-input-error" : ""}`}
                              style={{ flex: 1, minHeight: "2.5rem", paddingRight: "2.5rem" }}
                              disabled={addSubmitting}
                            />
                            <button
                              type="button"
                              className="btn btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                              onClick={() => !addSubmitting && setShowPassword((prev) => !prev)}
                              disabled={addSubmitting}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="account-approvals-btn-approve-modal"
                            onClick={handleGeneratePassword}
                            disabled={addSubmitting}
                            title="Generate password"
                          >
                            <FaKey aria-hidden="true" />
                            Generate
                          </button>
                        </div>
                        <div className={`password-criteria-wrapper ${showPasswordCriteria ? "password-criteria-visible" : ""}`}>
                          <div className="password-criteria-inner">
                            <ul className="password-criteria-content small text-secondary mb-3 ps-3 list-unstyled">
                              <li className={passwordValidation.minLength ? "text-success" : ""}>• At least 8 characters</li>
                              <li className={passwordValidation.hasLetter ? "text-success" : ""}>• Contains a letter</li>
                              <li className={passwordValidation.hasNumber ? "text-success" : ""}>• Contains a number</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="sh-add-employee-id" className="account-approvals-remarks-label">Employee ID <span style={{ color: "var(--footer-text)", fontWeight: 500 }}>(optional)</span></label>
                        <input
                          id="sh-add-employee-id"
                          name="employee_id"
                          type="text"
                          value={addForm.employee_id}
                          onChange={handleAddChange}
                          placeholder="Employee ID"
                          className="account-approvals-remarks-textarea"
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="sh-add-position" className="account-approvals-remarks-label">Position <span style={{ color: "var(--footer-text)", fontWeight: 500 }}>(optional)</span></label>
                        <input
                          id="sh-add-position"
                          name="position"
                          type="text"
                          value={addForm.position}
                          onChange={handleAddChange}
                          placeholder="e.g. School Head"
                          className="account-approvals-remarks-textarea"
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="sh-add-division" className="account-approvals-remarks-label">Division <span style={{ color: "var(--footer-text)", fontWeight: 500 }}>(optional)</span></label>
                        <input
                          id="sh-add-division"
                          name="division"
                          type="text"
                          value={addForm.division}
                          onChange={handleAddChange}
                          placeholder="Division / Office"
                          className="account-approvals-remarks-textarea"
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="sh-add-school" className="account-approvals-remarks-label">School name <span style={{ color: "var(--footer-text)", fontWeight: 500 }}>(optional)</span></label>
                        <input
                          id="sh-add-school"
                          name="school_name"
                          type="text"
                          value={addForm.school_name}
                          onChange={handleAddChange}
                          placeholder="School name"
                          className="account-approvals-remarks-textarea"
                          style={{ minHeight: "2.5rem" }}
                          disabled={addSubmitting}
                        />
                      </div>

                      <section className="school-head-accounts-assignments-section school-head-add-assignments-section">
                        <h3 className="school-head-accounts-assignments-title">
                          Assigned Administrative Officers <span className="school-head-add-assignments-required">*</span>
                        </h3>
                        <p className="school-head-add-assignments-hint">
                          Assign at least one Administrative Officer to this School Head. You can add or remove assignments later from the School Head details.
                        </p>
                        {addErrors.assignments && (
                          <div className="school-head-add-field-error-wrapper school-head-add-field-error-visible">
                            <div className="school-head-add-field-error-inner">
                              <p className="school-head-add-field-error-msg">{addErrors.assignments}</p>
                            </div>
                          </div>
                        )}
                        {addModalAosToAssign.length === 0 ? (
                          <p className="school-head-accounts-assignments-empty">
                            No Administrative Officers selected. Use the dropdown below to assign.
                          </p>
                        ) : (
                          <ul className="school-head-accounts-assignments-list">
                            {addModalAosToAssign.map((ao) => (
                              <li key={ao.id} className="school-head-accounts-assignments-item">
                                <div className="school-head-accounts-name-cell">
                                  <div className="school-head-accounts-avatar" aria-hidden="true">
                                    <div className="school-head-accounts-avatar-placeholder">
                                      {getInitials(ao.name)}
                                    </div>
                                  </div>
                                  <div className="school-head-accounts-assignments-text">
                                    <div className="school-head-accounts-assignments-name" title={ao.name}>
                                      {ao.name}
                                    </div>
                                    <div className="school-head-accounts-assignments-meta">
                                      <span title={ao.school_name || "—"}>{ao.school_name || "—"}</span>
                                      {ao.position && (
                                        <>
                                          <span aria-hidden="true"> · </span>
                                          <span title={ao.position}>{ao.position}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="school-head-accounts-assignments-remove"
                                  onClick={() => handleAddModalRemoveAo(ao.id)}
                                  disabled={addSubmitting}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="school-head-accounts-assignments-form">
                          <label className="school-head-accounts-assignments-label">
                            <span>Add Administrative Officer</span>
                            <div className="school-head-accounts-assignments-select-row">
                              <SearchableAoSelect
                                options={availableAos.filter(
                                  (ao) => !addModalAosToAssign.some((a) => Number(a.id) === Number(ao.id))
                                )}
                                value={addModalSelectedAoId}
                                onChange={setAddModalSelectedAoId}
                                loading={addModalAosLoading}
                                disabled={addSubmitting}
                                placeholder="Search by name or school..."
                                aria-label="Select Administrative Officer"
                              />
                              <button
                                type="button"
                                className="school-head-accounts-assignments-add-btn"
                                disabled={!addModalSelectedAoId || addSubmitting}
                                onClick={handleAddModalAddAo}
                              >
                                <FaUserGraduate aria-hidden="true" />
                                <span>Assign AO</span>
                              </button>
                            </div>
                          </label>
                        </div>
                      </section>
                    </div>
                    <div className="account-approvals-action-footer">
                      <button type="button" className="account-approvals-details-btn-close" onClick={handleRequestCloseAddModal} disabled={addSubmitting}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="account-approvals-btn-approve-modal"
                        disabled={addSubmitting}
                        aria-busy={addSubmitting}
                      >
                        {addSubmitting ? (
                          <>
                            <FaSpinner className="spinner" aria-hidden="true" />
                            <span>Creating…</span>
                          </>
                        ) : (
                          <>
                            <FaUserPlus aria-hidden="true" />
                            <span>Create account</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {addModalOpen && showAddConfirm &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-confirm-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="school-head-confirm-add-title"
            aria-describedby="school-head-confirm-add-desc"
          >
            <div
              className="account-approvals-details-backdrop modal-backdrop-animation"
              onClick={() => !addSubmitting && handleAddConfirmCancel()}
              onKeyDown={(e) => e.key === "Enter" && !addSubmitting && handleAddConfirmCancel()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="account-approvals-details-wrap account-approvals-confirm-wrap">
              <div className="account-approvals-details-modal account-approvals-confirm-modal modal-content-animation">
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="school-head-confirm-add-title" className="account-approvals-details-title">
                      Confirm creation
                    </h2>
                    <p id="school-head-confirm-add-desc" className="account-approvals-details-subtitle">
                      Create this School Head account?
                    </p>
                  </div>
                </div>
                <div className="account-approvals-details-body account-approvals-confirm-body">
                  <p className="account-approvals-confirm-text">
                    You are about to create an account for <strong>{addForm.name?.trim() || "this user"}</strong> ({addForm.email?.trim() || "—"}). The user will receive the credentials to sign in. This action cannot be undone from this screen.
                  </p>
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleAddConfirmCancel}
                    disabled={addSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-approve-modal"
                    onClick={handleAddConfirmSubmit}
                    disabled={addSubmitting}
                    aria-busy={addSubmitting}
                  >
                    {addSubmitting ? (
                      <>
                        <FaSpinner className="spinner" aria-hidden="true" />
                        <span>Creating…</span>
                      </>
                    ) : (
                      <>
                        <FaUserPlus aria-hidden="true" />
                        <span>Confirm creation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {addModalOpen && showAddDiscardConfirm &&
        createPortal(
          <div
            className="account-approvals-details-overlay account-approvals-confirm-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="school-head-confirm-discard-title"
            aria-describedby="school-head-confirm-discard-desc"
          >
            <div
              className="account-approvals-details-backdrop modal-backdrop-animation"
              onClick={() => !addSubmitting && handleAddDiscardCancel()}
              onKeyDown={(e) => e.key === "Enter" && !addSubmitting && handleAddDiscardCancel()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="account-approvals-details-wrap account-approvals-confirm-wrap">
              <div className="account-approvals-details-modal account-approvals-confirm-modal modal-content-animation">
                <div className="account-approvals-details-header account-approvals-action-header">
                  <div className="account-approvals-details-header-text">
                    <h2 id="school-head-confirm-discard-title" className="account-approvals-details-title">
                      Discard changes
                    </h2>
                    <p id="school-head-confirm-discard-desc" className="account-approvals-details-subtitle">
                      Close this form?
                    </p>
                  </div>
                </div>
                <div className="account-approvals-details-body account-approvals-confirm-body">
                  <p className="account-approvals-confirm-text">
                    You have unsaved information in this form. If you close it now, your changes will be discarded.
                  </p>
                </div>
                <div className="account-approvals-details-footer account-approvals-action-footer">
                  <button
                    type="button"
                    className="account-approvals-details-btn-close"
                    onClick={handleAddDiscardCancel}
                    disabled={addSubmitting}
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    className="account-approvals-btn-approve-modal"
                    onClick={handleAddDiscardConfirm}
                    disabled={addSubmitting}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Deactivate modal (same structure as Personnel Directory) */}
      {deactivateUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="school-head-deactivate-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${deactivateModalClosing ? "exit" : ""}`}
              onClick={() => !deactivateSubmitting && handleCloseDeactivate()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal modal-content-animation ${deactivateModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-deactivate-title" className="personnel-dir-modal-title">Deactivate account</h2>
                    <p className="personnel-dir-modal-subtitle">{deactivateUser.name}{deactivateUser.email ? ` · ${deactivateUser.email}` : ""}</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseDeactivate} disabled={deactivateSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <label htmlFor="school-head-deactivate-remarks" className="personnel-dir-remarks-label">Remarks <span className="personnel-dir-remarks-optional">(optional)</span></label>
                  <textarea
                    id="school-head-deactivate-remarks"
                    className="personnel-dir-remarks-textarea"
                    placeholder="Enter remarks for the record."
                    value={deactivateRemarks}
                    onChange={(e) => setDeactivateRemarks(e.target.value)}
                    rows={4}
                    disabled={deactivateSubmitting}
                  />
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDeactivate} disabled={deactivateSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-deactivate-modal" onClick={handleDeactivateConfirmOpen} disabled={deactivateSubmitting} aria-busy={deactivateSubmitting}>
                    {deactivateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deactivating…</span></> : <><FaUserTimes aria-hidden="true" /><span>Deactivate</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Deactivate confirmation overlay (same as Personnel Directory) */}
      {deactivateUser && showDeactivateConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="school-head-confirm-deactivate-title" aria-describedby="school-head-confirm-deactivate-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleDeactivateConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleDeactivateConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-confirm-deactivate-title" className="personnel-dir-modal-title">Confirm deactivation</h2>
                    <p id="school-head-confirm-deactivate-desc" className="personnel-dir-modal-subtitle">Deactivate this account?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to deactivate <strong>{deactivateUser.name}</strong>&apos;s account. The user will be logged out immediately and will not be able to sign in until reactivated. This action cannot be undone from this screen.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleDeactivateConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-deactivate-modal" onClick={handleDeactivateSubmit} disabled={deactivateSubmitting} aria-busy={deactivateSubmitting}>
                    {deactivateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deactivating…</span></> : <><FaUserTimes aria-hidden="true" /><span>Confirm deactivation</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Activate modal (same structure as Personnel Directory) */}
      {activateUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="school-head-activate-title">
            <div
              className={`personnel-dir-backdrop modal-backdrop-animation ${activateModalClosing ? "exit" : ""}`}
              onClick={() => !activateSubmitting && handleCloseActivate()}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal modal-content-animation ${activateModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-activate-title" className="personnel-dir-modal-title">Activate account</h2>
                    <p className="personnel-dir-modal-subtitle">{activateUser.name}{activateUser.email ? ` · ${activateUser.email}` : ""}</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseActivate} disabled={activateSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <label htmlFor="school-head-activate-remarks" className="personnel-dir-remarks-label">Remarks <span className="personnel-dir-remarks-optional">(optional)</span></label>
                  <textarea
                    id="school-head-activate-remarks"
                    className="personnel-dir-remarks-textarea"
                    placeholder="Enter remarks for the record."
                    value={activateRemarks}
                    onChange={(e) => setActivateRemarks(e.target.value)}
                    rows={4}
                    disabled={activateSubmitting}
                  />
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseActivate} disabled={activateSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-approve-modal" onClick={handleActivateConfirmOpen} disabled={activateSubmitting} aria-busy={activateSubmitting}>
                    {activateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Activating…</span></> : <><FaUserCheck aria-hidden="true" /><span>Activate</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Activate confirmation overlay (same as Personnel Directory) */}
      {activateUser && showActivateConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="school-head-confirm-activate-title" aria-describedby="school-head-confirm-activate-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleActivateConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleActivateConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-confirm-activate-title" className="personnel-dir-modal-title">Confirm activation</h2>
                    <p id="school-head-confirm-activate-desc" className="personnel-dir-modal-subtitle">Activate this account?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to activate <strong>{activateUser.name}</strong>&apos;s account. The user will be able to sign in again. This action cannot be undone from this screen.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleActivateConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-approve-modal" onClick={handleActivateSubmit} disabled={activateSubmitting} aria-busy={activateSubmitting}>
                    {activateSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Activating…</span></> : <><FaUserCheck aria-hidden="true" /><span>Confirm activation</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete modal (same as Personnel Directory delete personnel record) */}
      {deleteUser &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-action-overlay" role="dialog" aria-modal="true" aria-labelledby="school-head-delete-title">
            <div className={`personnel-dir-backdrop modal-backdrop-animation ${deleteModalClosing ? "exit" : ""}`} onClick={() => !deleteSubmitting && handleCloseDelete()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap">
              <div className={`personnel-dir-modal personnel-dir-action-modal personnel-dir-confirm-modal modal-content-animation ${deleteModalClosing ? "exit" : ""}`}>
                <header className="personnel-dir-modal-header personnel-dir-action-header personnel-dir-reject-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-delete-title" className="personnel-dir-modal-title">Delete School Head account</h2>
                    <p className="personnel-dir-modal-subtitle">Permanent removal from the system. This action cannot be undone.</p>
                  </div>
                  <button type="button" className="personnel-dir-modal-close" onClick={handleCloseDelete} disabled={deleteSubmitting} aria-label="Close">×</button>
                </header>
                <div className="personnel-dir-modal-body">
                  <div className="personnel-dir-confirm-info">
                    <div className="personnel-dir-confirm-info-row">
                      <span className="personnel-dir-confirm-info-label">Name</span>
                      <span className="personnel-dir-confirm-info-value">{deleteUser.name}</span>
                    </div>
                    <div className="personnel-dir-confirm-info-row">
                      <span className="personnel-dir-confirm-info-label">Email</span>
                      <span className="personnel-dir-confirm-info-value">{deleteUser.email}</span>
                    </div>
                  </div>
                  <p className="personnel-dir-confirm-text">
                    This School Head account will be permanently removed from the system. All associated data will be deleted.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleCloseDelete} disabled={deleteSubmitting}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-delete-modal" onClick={handleDeleteConfirmOpen} disabled={deleteSubmitting} aria-busy={deleteSubmitting}>
                    {deleteSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deleting…</span></> : <><FaTrash aria-hidden="true" /><span>Delete</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete confirmation overlay */}
      {deleteUser && showDeleteConfirm &&
        createPortal(
          <div className="personnel-dir-overlay personnel-dir-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="school-head-confirm-delete-title" aria-describedby="school-head-confirm-delete-desc">
            <div className="personnel-dir-backdrop modal-backdrop-animation" onClick={handleDeleteConfirmCancel} onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirmCancel()} role="button" tabIndex={0} aria-label="Close" />
            <div className="personnel-dir-wrap personnel-dir-confirm-wrap">
              <div className="personnel-dir-modal personnel-dir-confirm-modal modal-content-animation">
                <header className="personnel-dir-modal-header personnel-dir-action-header personnel-dir-reject-header">
                  <div className="personnel-dir-modal-header-text">
                    <h2 id="school-head-confirm-delete-title" className="personnel-dir-modal-title">Confirm deletion</h2>
                    <p id="school-head-confirm-delete-desc" className="personnel-dir-modal-subtitle">Delete this School Head account?</p>
                  </div>
                </header>
                <div className="personnel-dir-modal-body personnel-dir-confirm-body">
                  <p className="personnel-dir-confirm-text">
                    You are about to permanently delete <strong>{deleteUser.name}</strong>&apos;s account from the system. All associated data will be removed. This action cannot be undone.
                  </p>
                </div>
                <footer className="personnel-dir-modal-footer personnel-dir-action-footer">
                  <button type="button" className="personnel-dir-btn-close" onClick={handleDeleteConfirmCancel}>Cancel</button>
                  <button type="button" className="personnel-dir-btn-delete-modal" onClick={handleDeleteSubmit} disabled={deleteSubmitting} aria-busy={deleteSubmitting}>
                    {deleteSubmitting ? <><FaSpinner className="spinner" aria-hidden="true" /><span>Deleting…</span></> : <><FaTrash aria-hidden="true" /><span>Confirm deletion</span></>}
                  </button>
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
