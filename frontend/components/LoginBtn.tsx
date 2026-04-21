"use client";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

const LoginBtn = () => {
  const handleClick = () => {
    posthog.capture("cta_clicked", {
      button_id: "explore-btn",
      button_text: "Get Started/Login",
      location: "homepage",
    });
  };

  return (
    <Link
      href="/login"
      id="explore-btn"
      className="mt-7 mx-auto inline-flex items-center gap-2"
      onClick={handleClick}
    >
      Get Started / Login
      <Image src="/icons/audience.svg" alt="audience" width={20} height={20} />
    </Link>
  );
};

export default LoginBtn;
