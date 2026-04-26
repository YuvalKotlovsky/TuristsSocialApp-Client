import { Outlet } from "react-router-dom";
import { Footer as HeaderNav } from "@/functions/layout/Footer";
import { useSelector } from "react-redux";
import type { RootState } from "@/services";

export default function AppLayout() {
  const isUserLoggedIn = useSelector(
    (state: RootState) => state.auth.isUserLoggedIn
  );

  return (
    <>
      {isUserLoggedIn && <HeaderNav />}
      <HeaderNav />
      <main className={isUserLoggedIn ? "pt-16" : "w-full"}>
        <Outlet />
      </main>
    </>
  );
}
