import React, { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID, loginWithGoogle } from '../services/api'

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let googleScriptPromise = null

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (googleScriptPromise) {
    return googleScriptPromise
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

function getAuthErrorMessage(error) {
  const data = error?.response?.data

  if (data?.detail) {
    return data.detail
  }

  if (data && typeof data === 'object') {
    const messages = Object.values(data).flat().filter(Boolean)
    if (messages.length) {
      return messages.join(' ')
    }
  }

  return 'Google sign-in failed. Please try again.'
}

function GoogleLoginButton({ onSuccess, onError, text = 'continue_with' }) {
  const buttonRef = useRef(null)
  const mountedRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    async function renderGoogleButton() {
      try {
        await loadGoogleIdentityScript()

        if (cancelled || !buttonRef.current) {
          return
        }

        buttonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) {
              onErrorRef.current?.('Google sign-in did not return a credential.')
              return
            }

            try {
              const res = await loginWithGoogle(response.credential)
              if (mountedRef.current) {
                onSuccessRef.current?.(res.data)
              }
            } catch (error) {
              if (mountedRef.current) {
                onErrorRef.current?.(getAuthErrorMessage(error))
              }
            }
          },
        })

        const width = Math.min(buttonRef.current.clientWidth || 320, 400)
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width,
        })
      } catch (error) {
        if (mountedRef.current) {
          onErrorRef.current?.('Google sign-in is unavailable right now.')
        }
      }
    }

    renderGoogleButton()

    return () => {
      cancelled = true
      mountedRef.current = false
      if (buttonRef.current) {
        buttonRef.current.innerHTML = ''
      }
    }
  }, [text])

  return (
    <div className="w-full">
      <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
    </div>
  )
}

export default GoogleLoginButton
