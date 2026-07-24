type UseHandler = (itemId: string, targetId: string) => void

type PointerDrag = {
  itemId: string
  pointerId: number
  startX: number
  startY: number
  active: boolean
}

export class InventoryDragCoordinator {
  #pointerDrag: PointerDrag | null = null
  #onUse: UseHandler

  constructor(
    private readonly root: HTMLElement,
    onUse: UseHandler,
  ) {
    this.#onUse = onUse
    root.addEventListener('dragstart', this.#handleDragStart)
    root.addEventListener('dragover', this.#handleDragOver)
    root.addEventListener('drop', this.#handleDrop)
    root.addEventListener('pointerdown', this.#handlePointerDown)
    root.addEventListener('pointermove', this.#handlePointerMove)
    root.addEventListener('pointerup', this.#handlePointerUp)
    root.addEventListener('pointercancel', this.#cancelPointer)
  }

  setUseHandler(handler: UseHandler): void {
    this.#onUse = handler
  }

  destroy(): void {
    this.root.removeEventListener('dragstart', this.#handleDragStart)
    this.root.removeEventListener('dragover', this.#handleDragOver)
    this.root.removeEventListener('drop', this.#handleDrop)
    this.root.removeEventListener('pointerdown', this.#handlePointerDown)
    this.root.removeEventListener('pointermove', this.#handlePointerMove)
    this.root.removeEventListener('pointerup', this.#handlePointerUp)
    this.root.removeEventListener('pointercancel', this.#cancelPointer)
  }

  #handleDragStart = (event: DragEvent): void => {
    const element = (event.target as HTMLElement).closest<HTMLElement>('[data-inventory-item]')
    const itemId = element?.dataset.inventoryItem
    if (!itemId || !event.dataTransfer) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-starwreck-item', itemId)
    element.dataset.dragging = 'true'
  }

  #handleDragOver = (event: DragEvent): void => {
    if ((event.target as HTMLElement).closest('[data-drop-target]')) {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    }
  }

  #handleDrop = (event: DragEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drop-target]')
    const targetId = target?.dataset.dropTarget
    const itemId = event.dataTransfer?.getData('application/x-starwreck-item')
    if (!targetId || !itemId) return
    event.preventDefault()
    this.root
      .querySelectorAll<HTMLElement>('[data-dragging]')
      .forEach((element) => delete element.dataset.dragging)
    this.#onUse(itemId, targetId)
  }

  #handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return
    const element = (event.target as HTMLElement).closest<HTMLElement>('[data-inventory-item]')
    const itemId = element?.dataset.inventoryItem
    if (!itemId) return
    this.#pointerDrag = {
      itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    }
    element.setPointerCapture(event.pointerId)
  }

  #handlePointerMove = (event: PointerEvent): void => {
    const drag = this.#pointerDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (distance < 8 && !drag.active) return
    drag.active = true
    this.root.dataset.dragActive = drag.itemId
    event.preventDefault()
  }

  #handlePointerUp = (event: PointerEvent): void => {
    const drag = this.#pointerDrag
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.active) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-drop-target]')
      const targetId = target?.dataset.dropTarget
      if (targetId) this.#onUse(drag.itemId, targetId)
    }

    delete this.root.dataset.dragActive
    this.#pointerDrag = null
  }

  #cancelPointer = (): void => {
    delete this.root.dataset.dragActive
    this.#pointerDrag = null
  }
}

