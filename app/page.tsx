import { SplashScreen } from "@/components/auth/splash-screen";

export default function HomePage() {
  return <SplashScreen durationMs={2000} href="/login" />;
}
