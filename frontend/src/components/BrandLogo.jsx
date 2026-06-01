import React from 'react'
import { Link } from 'react-router-dom'

function BrandLogo({ to = '/', showText = true, className = '', textClassName = 'text-xl' }) {
  const content = (
    <>
      <span className="relative shrink-0">
        <span className="block h-3 w-3 rounded-full bg-emerald-500 pulse-green" />
        <span className="absolute inset-0 block h-3 w-3 rounded-full bg-emerald-500 opacity-30 blur-sm" />
      </span>
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
