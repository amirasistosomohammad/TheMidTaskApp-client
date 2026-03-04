import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { apiRequest, getAuthToken, setAuthToken } from "../services/apiClient";
import { AuthContext } from "./AuthContextBase";

const REJECTION_STORAGE_KEY = "midtask_login_rejection";
const DEACTIVATION_STORAGE_KEY = "midtask_login_deactivated";
const USER_POLL_INTERVAL_MS = 20000; // 20s – detect rejection soon after admin rejects

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const pollIntervalRef = useRef(null);

  /** On 403 rejection: clear auth, store rejection for login page, redirect to login. */
  const handleRejectionLogout = useCallback((data) => {
    setAuthToken(null);
    setUser(null);
    try {
      sessionStorage.setItem(
        REJECTION_STORAGE_KEY,
        JSON.stringify({
          rejection_remarks: data?.rejection_remarks ?? data?.rejectionRemarks ?? null,
        })
      );
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }, []);

  /** On 403 deactivation: clear auth, store deactivation for login page, redirect (user was deactivated by admin). */
  const handleDeactivationLogout = useCallback((data) => {
    setAuthToken(null);
    setUser(null);
    try {
      sessionStorage.setItem(
        DEACTIVATION_STORAGE_KEY,
        JSON.stringify({
          deactivation_remarks: data?.deactivation_remarks ?? data?.deactivationRemarks ?? null,
        })
      );
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }, []);

  const fetchUser = useCallback(
    async (isPoll = false) => {
      const token = getAuthToken();
      if (!token) return null;
      try {
        const data = await apiRequest("/user", { auth: true });
        if (data?.user) setUser(data.user);
        return data?.user ?? null;
      } catch (e) {
        if (e?.status === 403) {
          const isRejection =
            e?.data?.rejection_remarks !== undefined ||
            e?.data?.rejectionRemarks !== undefined ||
            (e?.data?.message && String(e.data.message).toLowerCase().includes("rejected"));
          const isDeactivation =
            e?.data?.deactivation_remarks !== undefined ||
            e?.data?.deactivationRemarks !== undefined ||
            (e?.data?.message && String(e.data.message).toLowerCase().includes("deactivated"));
          if (isRejection) {
            handleRejectionLogout(e.data);
            return null;
          }
          if (isDeactivation) {
            handleDeactivationLogout(e.data);
            return null;
          }
        }
        if (e?.status === 401) {
          setAuthToken(null);
          setUser(null);
          // Token revoked (e.g. deactivated) or expired – redirect to login
          window.location.href = "/login";
        }
        return null;
      }
    },
    [handleRejectionLogout, handleDeactivationLogout]
  );

  const bootstrap = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setBootstrapped(true);
      return;
    }
    try {
      const u = await fetchUser(false);
      if (u !== undefined && u !== null) setUser(u);
    } catch {
      setUser(null);
    } finally {
      setBootstrapped(true);
    }
  }, [fetchUser]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Poll GET /user when logged in so we detect rejection soon after admin rejects
  useEffect(() => {
    if (!user || !getAuthToken()) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }
    pollIntervalRef.current = setInterval(() => {
      fetchUser(true);
    }, USER_POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user, fetchUser]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: { email, password },
      });

      setAuthToken(data?.token);
      setUser(data?.user ?? null);

      return { success: true, user: data?.user, token: data?.token };
    } catch (e) {
      // Prefer field-specific error (e.g. "Invalid credentials" for unverified email)
      const msg =
        e?.data?.errors?.email?.[0] ||
        e?.data?.message ||
        e?.message ||
        "Login failed.";
      // 403: distinguish rejected vs deactivated (server sends different remarks)
      const rejectionRemarks =
        e?.data?.rejection_remarks ?? e?.data?.rejectionRemarks ?? null;
      const deactivationRemarks =
        e?.data?.deactivation_remarks ?? e?.data?.deactivationRemarks ?? null;
      const isDeactivated =
        "deactivation_remarks" in (e?.data || {}) ||
        "deactivationRemarks" in (e?.data || {}) ||
        (e?.data?.message && String(e.data.message).toLowerCase().includes("deactivated"));
      return {
        success: false,
        error: msg,
        rejection_remarks: rejectionRemarks,
        deactivation_remarks: deactivationRemarks,
        accountStatus: isDeactivated ? "deactivated" : "rejected",
        status: e?.data?.status,
        httpStatus: e?.status,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const data = await apiRequest("/register", {
        method: "POST",
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
          employee_id: formData.employee_id,
          position: formData.position,
          division: formData.division,
          school_name: formData.school_name,
        },
      });

      return { success: true, message: data?.message, email: data?.email };
    } catch (e) {
      const msg =
        e?.data?.message ||
        e?.data?.errors?.email?.[0] ||
        e?.data?.errors?.password?.[0] ||
        e?.message ||
        "Registration failed.";
      return { success: false, error: msg, httpStatus: e?.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    setLoading(true);
    try {
      await apiRequest("/verify-email", {
        method: "POST",
        body: { email, otp },
      });
      return { success: true };
    } catch (e) {
      const msg =
        e?.data?.message ||
        e?.data?.errors?.otp?.[0] ||
        e?.message ||
        "Verification failed.";
      return { success: false, error: msg, httpStatus: e?.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async (email) => {
    setLoading(true);
    try {
      const data = await apiRequest("/resend-otp", {
        method: "POST",
        body: { email },
      });
      return { success: true, message: data?.message };
    } catch (e) {
      const msg =
        e?.data?.message ||
        e?.message ||
        "Failed to resend verification code.";
      return { success: false, error: msg, httpStatus: e?.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiRequest("/logout", { method: "POST", auth: true });
    } catch {
      // ignore; still clear local state
    } finally {
      setAuthToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    try {
      await apiRequest("/forgot-password", {
        method: "POST",
        body: { email },
      });
      return { success: true };
    } catch (e) {
      // Prefer field-specific error (e.g. "verify email first" for unverified accounts)
      const msg =
        e?.data?.errors?.email?.[0] ||
        e?.data?.message ||
        e?.message ||
        "Failed to send reset password link.";
      return { success: false, error: msg, httpStatus: e?.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async ({ email, token, password, password_confirmation }) => {
      setLoading(true);
      try {
        await apiRequest("/reset-password", {
          method: "POST",
          body: { email, token, password, password_confirmation },
        });
        return { success: true };
      } catch (e) {
        const msg =
          e?.data?.message ||
          e?.data?.errors?.token?.[0] ||
          e?.data?.errors?.password?.[0] ||
          e?.message ||
          "Reset password failed.";
        return { success: false, error: msg, httpStatus: e?.status };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const u = await fetchUser(false);
    if (u) setUser(u);
    return u;
  }, [fetchUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      bootstrapped,
      login,
      register,
      verifyEmail,
      resendOtp,
      forgotPassword,
      resetPassword,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }),
    [
      user,
      loading,
      bootstrapped,
      login,
      register,
      verifyEmail,
      resendOtp,
      forgotPassword,
      resetPassword,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
