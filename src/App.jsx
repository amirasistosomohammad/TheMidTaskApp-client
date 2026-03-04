import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { ToastContainer } from "./services/notificationService";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import ForgotPassword from "./pages/public/ForgotPassword";
import ResetPassword from "./pages/public/ResetPassword";
import PublicRoute from "./components/PublicRoute";
import RoleRoute from "./components/RoleRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./layout/Layout";
import AdminOfficerDashboard from "./pages/dashboard/AdminOfficerDashboard";
import TaskDetail from "./pages/dashboard/TaskDetail";
import Timeline from "./pages/dashboard/Timeline";
import TaskList from "./pages/dashboard/TaskList";
import CreateTask from "./pages/dashboard/CreateTask";
import EditTask from "./pages/dashboard/EditTask";
import AssignTask from "./pages/dashboard/AssignTask";
import DashboardWithStatus from "./components/DashboardWithStatus";
import SchoolHeadDashboard from "./pages/dashboard/SchoolHeadDashboard";
import AccountApprovals from "./pages/dashboard/AccountApprovals";
import PersonnelDirectory from "./pages/dashboard/PersonnelDirectory";
import CreateSchoolHead from "./pages/dashboard/CreateSchoolHead";
import SchoolHeadAccounts from "./pages/dashboard/SchoolHeadAccounts";
import Profile from "./pages/dashboard/Profile";
import MonitorOfficers from "./pages/dashboard/MonitorOfficers";
import InDevelopmentPlaceholder from "./components/InDevelopmentPlaceholder";
import SchoolHeadValidations from "./pages/dashboard/SchoolHeadValidations";

function AuthBootstrap({ children }) {
  const { bootstrapped } = useAuth();

  if (!bootstrapped) {
  return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="loader-ring" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading</span>
        </div>
        <p className="mb-0 mt-3 fw-semibold text-secondary">Loading...</p>
    </div>
  );
}

  return children;
}

function AppRoot() {
  return (
      <AuthProvider>
      <AuthBootstrap>
        <Outlet />
        <ToastContainer />
      </AuthBootstrap>
      </AuthProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppRoot />}>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="profile" element={<Profile />} />
        <Route
          path="dashboard"
          element={
            <RoleRoute allowRoles={["administrative_officer"]}>
              <AdminOfficerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="school-head"
          element={
            <RoleRoute allowRoles={["school_head"]}>
              <SchoolHeadDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <InDevelopmentPlaceholder
                title="Dashboard"
                description="Central admin overview, pending registrations, and task management summary will appear here. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/account-approvals"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <AccountApprovals />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/personnel"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <PersonnelDirectory />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/school-heads"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <SchoolHeadAccounts />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/users/create"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <CreateSchoolHead />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/tasks"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <TaskList />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/tasks/create"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <CreateTask />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/tasks/:id/edit"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <EditTask />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/tasks/assign"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <AssignTask />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/tasks/:id/assign"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <AssignTask />
            </RoleRoute>
          }
        />
        <Route
          path="dashboard/my-tasks"
          element={
            <RoleRoute allowRoles={["administrative_officer"]}>
              <InDevelopmentPlaceholder
                title="My tasks"
                description="View and manage your assigned tasks. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="dashboard/my-tasks/:id"
          element={
            <RoleRoute allowRoles={["administrative_officer"]}>
              <TaskDetail />
            </RoleRoute>
          }
        />
        <Route
          path="dashboard/timeline"
          element={
            <RoleRoute allowRoles={["administrative_officer"]}>
              <Timeline />
            </RoleRoute>
          }
        />
        <Route
          path="dashboard/submissions"
          element={
            <RoleRoute allowRoles={["administrative_officer"]}>
              <InDevelopmentPlaceholder
                title="My submissions"
                description="View and track your submitted MOVs and input data. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="school-head/validations"
          element={
            <RoleRoute allowRoles={["school_head"]}>
              <SchoolHeadValidations />
            </RoleRoute>
          }
        />
        <Route
          path="school-head/task-history"
          element={
            <RoleRoute allowRoles={["school_head"]}>
              <InDevelopmentPlaceholder
                title="Task history"
                description="View task and submission history for evaluation and reporting. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="school-head/evaluation"
          element={
            <RoleRoute allowRoles={["school_head"]}>
              <InDevelopmentPlaceholder
                title="Performance evaluation"
                description="Conduct performance evaluation for Administrative Officers. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="school-head/reports"
          element={
            <RoleRoute allowRoles={["school_head"]}>
              <InDevelopmentPlaceholder
                title="Reports"
                description="Generate and export validation and performance reports. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/monitor"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <MonitorOfficers />
            </RoleRoute>
          }
        />
        <Route
          path="central-admin/activity-logs"
          element={
            <RoleRoute allowRoles={["central_admin"]}>
              <InDevelopmentPlaceholder
                title="Activity logs"
                description="View system activity and audit logs. This section will be available in a future release."
              />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
