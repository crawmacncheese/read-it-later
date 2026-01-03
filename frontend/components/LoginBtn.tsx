'use client';
import Image from "next/image";
import posthog from "posthog-js";

const LoginBtn = () => {
  const handleClick = () => {
    console.log("CLICKED");
    posthog.capture('cta_clicked', {
      button_id: 'explore-btn',
      button_text: 'Get Started/Login',
      location: 'homepage',
    });
  };

  return (
    <button type="button" id="explore-btn" className="mt-7 mx-auto" onClick={handleClick}>
        <a href="#login">
            Get Started/Login
            <Image src="/icons/audience.svg" alt = "audience" width = {20} height = {20} />
        </a>
    </button>
  )
}

export default LoginBtn
