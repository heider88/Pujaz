'use client'
// Foto de una pieza. Si no hay foto o no carga, muestra un marco con el emblema de Pujaz,
// para que el catálogo no quede con huecos.
import { useState } from 'react'

interface Props {
  src?: string
  alt: string
  nombre: string
  className?: string
}

export function ImagenLote({ src, alt, nombre, className = '' }: Props) {
  const [fallo, setFallo] = useState(false)

  if (!src || fallo) {
    return (
      <div className={`imagen-lote imagen-lote--vacia ${className}`} role="img" aria-label={`${nombre}, sin foto`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/emblema.png" alt="" width={240} height={192} />
      </div>
    )
  }

  return (
    // <img> normal y no next/image: las fotos vienen de cualquier URL que ponga quien publica.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // La foto ya viene en el HTML del servidor: si falló antes de que React se conectara,
      // onError no alcanzó a avisar. Al montar se revisa si quedó rota.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFallo(true)
      }}
      className={`imagen-lote ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFallo(true)}
    />
  )
}
