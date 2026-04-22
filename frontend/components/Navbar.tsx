"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAuth } from "@/components/auth-provider";

const Navbar = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogoClick = () => {
    posthog.capture("nav_logo_clicked", {
      destination: "/",
      location: "navbar",
    });
  };

  const handleHomeClick = () => {
    posthog.capture("nav_home_clicked", {
      destination: "/",
      location: "navbar",
    });
  };

  const handleLoginClick = () => {
    posthog.capture("nav_login_clicked", {
      destination: "/login",
      location: "navbar",
    });
  };

  const handleSignupClick = () => {
    posthog.capture("nav_signup_clicked", {
      destination: "/signup",
      location: "navbar",
    });
  };

  return (
    <header>
      <nav>
        <Link href="/" className="logo" onClick={handleLogoClick}>
          <Image src="/icons/logo.png" alt="logo" height={20} width={20} />
          <p>ReadItLater</p>
        </Link>
        <ul>
          <Link href="/" onClick={handleHomeClick}>
            Home
          </Link>
          {user ? (
            <>
              <Link href="/app">App</Link>
              <Link href="/app/profile">Profile</Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  posthog.reset();
                  router.push("/");
                  router.refresh();
                }}
                className="cursor-pointer bg-transparent text-inherit underline-offset-2 hover:underline"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" onClick={handleSignupClick}>
                Sign up
              </Link>
              <Link href="/login" onClick={handleLoginClick}>
                Login
              </Link>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;
