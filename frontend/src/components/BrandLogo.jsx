import React from 'react'
import { Link } from 'react-router-dom'

function BrandLogo({ to = '/', showText = true, className = '', textClassName = 'text-xl' }) {
  const content = (
    <img
      src={showText ? '/logo.svg' : '/favicon.svg'}
      alt="PingBEAT"
      className={showText ? 'h-10 w-36 shrink-0 object-cover object-center' : 'h-9 w-9 shrink-0 object-contain'}
    />
  )

  if (!to) {
    return <span className={`inline-flex items-center gap-3 ${className}`}>{content}</span>
  }

  return (
    <Link to={to} className={`inline-flex items-center gap-3 ${className}`}>
      {content}
    </Link>
  )
}

export default BrandLogo
