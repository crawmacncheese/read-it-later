'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)

    // Capture error to PostHog
    posthog.captureException(error);
    posthog.capture('error_displayed', {
      error_message: error.message,
      error_digest: error.digest,
      error_name: error.name,
    });
  }, [error])

  const handleRetryClick = () => {
    posthog.capture('error_retry_clicked', {
      error_message: error.message,
      error_digest: error.digest,
    });
    // Attempt to recover by trying to re-render the segment
    reset();
  };

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={handleRetryClick}>
        Try again
      </button>
    </div>
  )
}
