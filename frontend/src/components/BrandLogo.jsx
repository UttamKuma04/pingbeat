import React from 'react'
import { Link } from 'react-router-dom'

function BrandLogo({ to = '/', showText = true, className = '', textClassName = 'text-xl' }) {
  const content = (
    <>
      <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0 object-contain" />
      {showText && (
        <span className={`${textClassName} font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent`}>
          PingBEAT
        </span>
      )}
    </>
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
