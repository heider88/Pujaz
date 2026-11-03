'use client'
// Foto grande y miniaturas: al elegir una miniatura cambia la foto grande.
import { useState } from 'react'
import { ImagenLote } from './ImagenLote'

export function Galeria({ nombre, imagenes }: { nombre: string; imagenes: string[] }) {
  const [elegida, setElegida] = useState(0)

  return (
    <div className="detalle__galeria">
      <ImagenLote
        key={imagenes[elegida]}
        src={imagenes[elegida]}
        alt={`${nombre}, imagen ${elegida + 1}`}
        nombre={nombre}
        className="imagen-lote--grande"
      />
      {imagenes.length > 1 && (
        <div className="miniaturas">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`miniatura${i === elegida ? ' miniatura--activa' : ''}`}
              aria-label={`Ver imagen ${i + 1}`}
              aria-pressed={i === elegida}
              onClick={() => setElegida(i)}
            >
              <ImagenLote src={url} alt="" nombre={nombre} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
