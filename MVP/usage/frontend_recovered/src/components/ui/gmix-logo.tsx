import Image from 'next/image'

export function GmixLogo({ size = 44, centered = false }: { size?: number; centered?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="G-MIX"
      width={size}
      height={size}
      style={{ width: size, height: 'auto', display: 'block', ...(centered ? { margin: '0 auto' } : {}) }}
      priority
      unoptimized
    />
  )
}
