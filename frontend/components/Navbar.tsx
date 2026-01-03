'use client';
import Link from "next/link"
import Image from "next/image"
import posthog from "posthog-js"

const Navbar = () => {
  const handleLogoClick = () => {
    posthog.capture('nav_logo_clicked', {
      destination: '/',
      location: 'navbar',
    });
  };

  const handleHomeClick = () => {
    posthog.capture('nav_home_clicked', {
      destination: '/',
      location: 'navbar',
    });
  };

  const handleLoginClick = () => {
    posthog.capture('nav_login_clicked', {
      destination: '/login',
      location: 'navbar',
    });
  };

  return (
    <header>
        <nav>
            <Link href="/" className="logo" onClick={handleLogoClick}>
                <Image src="/icons/logo.png" alt="logo" height={20} width={20}/>
                <p>ReadItLater</p>
            </Link>
            <ul>
                <Link href="/" onClick={handleHomeClick}>Home</Link>
                <Link href="/login" onClick={handleLoginClick}>Login</Link>
                <Link href="/">sga</Link>
            </ul>
        </nav>
    </header>
  )
}

export default Navbar
