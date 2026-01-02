'use client';
import Image from "next/image";

const LoginBtn = () => {
  return (
    <button type="button" id="explore-btn" className="mt-7 mx-auto" onClick={() => {console.log("CLICKED")}}>
        <a href="#login">
            Get Started/Login
            <Image src="/icons/audience.svg" alt = "audience" width = {20} height = {20} />
        </a>
    </button>
  )
}

export default LoginBtn
