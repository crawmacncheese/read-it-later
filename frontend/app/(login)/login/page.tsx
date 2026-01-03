'use client';

import React, { useState } from 'react'
import posthog from 'posthog-js'

const Login = () => {
  const [email, setEmail] = useState('');

  // Note: Pageview tracking is handled automatically by PostHog with defaults: '2025-05-24'
  // The automatic $pageview event will capture visits to this page

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Identify user with PostHog when they log in
    if (email) {
      posthog.identify(email, {
        email: email,
      });

      posthog.capture('user_logged_in', {
        login_method: 'email',
      });
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

export default Login
