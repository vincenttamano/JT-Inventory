import { createHashRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { InventoryPage } from "../pages/InventoryPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { PatientUsagePage } from "../pages/PatientUsagePage";
import { UsagePage } from "../pages/UsagePage";
import { AppLayout } from "../components/layout/AppLayout";
import { PatientManagementPage } from "../pages/PatientManagementPage";
import { UserManagementPage } from "../pages/UserManagementPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";

export const router = createHashRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/reset-password",
    Component: ResetPasswordPage,
  },
  {
    path: "/dashboard",
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "inventory", Component: InventoryPage },
      { path: "usage", Component: UsagePage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "patient-usage", Component: PatientUsagePage },
      { path: "patient-management", Component: PatientManagementPage },
      { path: "users", Component: UserManagementPage },
    ],
  },
]);
