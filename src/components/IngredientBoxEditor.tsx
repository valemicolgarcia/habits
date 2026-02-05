/**
 * Editor de cajas (bounding boxes) sobre una imagen.
 * Permite dibujar nuevas cajas y mover las existentes.
 * Usa Pointer Events para funcionar en desktop (mouse) y móvil (touch).
 */

import { useCallback, useRef, useState } from 'react'

export interface IngredientWithBox {
  labelEn: string
  labelEs: string
  box: number[] | null
}

interface IngredientBoxEditorProps {
  imageUrl: string
  ingredients: IngredientWithBox[]
  onIngredientsChange: (ingredients: IngredientWithBox[]) => void
  /** Si no null, el próximo rectángulo dibujado se asigna a este índice. */
  drawModeForIndex: number | null
  onDrawModeCancel?: () => void
  className?: string
}

const MIN_BOX_SIZE = 15

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function IngredientBoxEditor({
  imageUrl,
  ingredients,
  onIngredientsChange,
  drawModeForIndex,
  onDrawModeCancel,
  className = '',
}: IngredientBoxEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [drawing, setDrawing] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const [moving, setMoving] = useState<{ index: number; startX: number; startY: number; box: number[] } | null>(null)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null)

  const displayToImage = useCallback(
    (displayX: number, displayY: number): [number, number] => {
      const img = imgRef.current
      if (!img || !imageSize) return [0, 0]
      const rect = img.getBoundingClientRect()
      const nx = (displayX - rect.left) / rect.width
      const ny = (displayY - rect.top) / rect.height
      return [clamp(nx, 0, 1) * imageSize.w, clamp(ny, 0, 1) * imageSize.h]
    },
    [imageSize]
  )

  const imageToDisplay = useCallback(
    (ix: number, iy: number): { x: number; y: number } => {
      const img = imgRef.current
      if (!img || !imageSize) return { x: 0, y: 0 }
      const rect = img.getBoundingClientRect()
      return {
        x: rect.left + (ix / imageSize.w) * rect.width,
        y: rect.top + (iy / imageSize.h) * rect.height,
      }
    },
    [imageSize]
  )

  const getImageRect = useCallback(() => {
    const img = imgRef.current
    if (!img) return null
    return img.getBoundingClientRect()
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const rect = getImageRect()
      if (!rect || !imageSize) return
      const clientX = e.clientX
      const clientY = e.clientY
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return

      if (drawModeForIndex !== null) {
        setDrawing({ startX: clientX, startY: clientY, currentX: clientX, currentY: clientY })
        return
      }

      for (let i = 0; i < ingredients.length; i++) {
        const box = ingredients[i].box
        if (!box || box.length !== 4) continue
        const [x0, y0, x1, y1] = box
        const tl = imageToDisplay(x0, y0)
        const br = imageToDisplay(x1, y1)
        const padding = 8
        if (
          clientX >= tl.x - padding &&
          clientX <= br.x + padding &&
          clientY >= tl.y - padding &&
          clientY <= br.y + padding
        ) {
          setMoving({ index: i, startX: clientX, startY: clientY, box: [...box] })
          return
        }
      }
    },
    [drawModeForIndex, ingredients, getImageRect, imageSize, displayToImage, imageToDisplay]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (drawing) {
        setDrawing((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null))
        return
      }
      if (moving) {
        const rect = getImageRect()
        if (!rect || !imageSize) return
        const dx = e.clientX - moving.startX
        const dy = e.clientY - moving.startY
        const scaleX = imageSize.w / rect.width
        const scaleY = imageSize.h / rect.height
        const newBox = [
          moving.box[0] + dx * scaleX,
          moving.box[1] + dy * scaleY,
          moving.box[2] + dx * scaleX,
          moving.box[3] + dy * scaleY,
        ]
        const [x0, y0, x1, y1] = newBox
        const clamped = [
          clamp(x0, 0, imageSize.w),
          clamp(y0, 0, imageSize.h),
          clamp(x1, 0, imageSize.w),
          clamp(y1, 0, imageSize.h),
        ]
        const next = ingredients.map((ing, i) =>
          i === moving.index ? { ...ing, box: clamped } : ing
        )
        onIngredientsChange(next)
        setMoving((prev) => (prev ? { ...prev, startX: e.clientX, startY: e.clientY, box: clamped } : null))
      }
    },
    [drawing, moving, ingredients, onIngredientsChange, getImageRect, imageSize]
  )

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (drawing && drawModeForIndex !== null) {
        const rect = getImageRect()
        if (!rect || !imageSize) {
          setDrawing(null)
          return
        }
        const [x0, y0] = displayToImage(drawing.startX, drawing.startY)
        const [x1, y1] = displayToImage(drawing.currentX, drawing.currentY)
        const minX = Math.min(x0, x1)
        const minY = Math.min(y0, y1)
        const maxX = Math.max(x0, x1)
        const maxY = Math.max(y0, y1)
        const w = maxX - minX
        const h = maxY - minY
        if (w >= MIN_BOX_SIZE && h >= MIN_BOX_SIZE && drawModeForIndex >= 0 && drawModeForIndex < ingredients.length) {
          const box = [minX, minY, maxX, maxY]
          const next = ingredients.map((ing, i) =>
            i === drawModeForIndex ? { ...ing, box } : ing
          )
          onIngredientsChange(next)
        }
        setDrawing(null)
        onDrawModeCancel?.()
        return
      }
      setMoving(null)
    },
    [drawing, drawModeForIndex, ingredients, onIngredientsChange, onDrawModeCancel, getImageRect, imageSize, displayToImage]
  )

  const handlePointerCancel = useCallback(() => {
    setDrawing(null)
    setMoving(null)
  }, [])

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current
    if (img && img.naturalWidth && img.naturalHeight) {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [])

  const containerRect = containerRef.current?.getBoundingClientRect()

  return (
    <div
      ref={containerRef}
      className={`relative inline-block max-w-full ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Plato"
        className="block max-w-full h-auto rounded-lg object-contain max-h-56"
        onLoad={handleImageLoad}
        draggable={false}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      />
      {imageSize && (
        <>
          {ingredients.map((ing, i) => {
            if (!ing.box || ing.box.length !== 4) return null
            const [x0, y0, x1, y1] = ing.box
            const left = (x0 / imageSize.w) * 100
            const top = (y0 / imageSize.h) * 100
            const width = ((x1 - x0) / imageSize.w) * 100
            const height = ((y1 - y0) / imageSize.h) * 100
            return (
              <div
                key={i}
                className="absolute border-2 border-lime-500 bg-lime-500/20 pointer-events-none rounded"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  boxSizing: 'border-box',
                }}
              />
            )
          })}
          {drawing && containerRect && (
            <div
              className="absolute border-2 border-dashed border-amber-500 bg-amber-500/20 pointer-events-none rounded"
              style={{
                left: `${(Math.min(drawing.startX, drawing.currentX) - containerRect.left) / containerRect.width * 100}%`,
                top: `${(Math.min(drawing.startY, drawing.currentY) - containerRect.top) / containerRect.height * 100}%`,
                width: `${Math.abs(drawing.currentX - drawing.startX) / containerRect.width * 100}%`,
                height: `${Math.abs(drawing.currentY - drawing.startY) / containerRect.height * 100}%`,
                boxSizing: 'border-box',
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
