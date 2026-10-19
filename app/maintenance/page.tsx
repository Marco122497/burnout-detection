import { MaintenanceNotice } from "@/components/auth/maintenance-notice";

export const metadata = {
  title: "Under maintenance",
};

export default function MaintenancePage() {
  return <MaintenanceNotice />;
}
