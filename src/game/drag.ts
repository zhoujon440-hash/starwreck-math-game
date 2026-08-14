import { InteractionController } from '../game-scene/InteractionController'

type UseHandler = (itemId: string, targetId: string) => boolean

type PointerDrag = {
  itemId: string
  pointerId: number
  startX: number
  startY: number
  active: boolean
  source: HTMLElement
}

export class InventoryDragCoordinator {
  #pointerDrag: PointerDrag | null = null
  #onUse: UseHandler
  readonly #interaction: InteractionController
  #dragGhost: HTMLElement | null = null
  #nativeDropped = false

  constructor(
    private readonly root: HTMLElement,
    onUse: UseHandler,
  ) {
    this.#onUse = onUse
    this.#interaction = new InteractionController(root)
    root.addEventListener('dragstart', this.#handleDragStart)
    root.addEventListener('dragover', this.#handleDragOver)
    root.addEventListener('drop', this.#handleDrop)
    root.addEventListener('dragend', this.#handleDragEnd)
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
    this.root.removeEventListener('dragend', this.#handleDragEnd)
    this.root.removeEventListener('pointerdown', this.#handlePointerDown)
    this.root.removeEventListener('pointermove', this.#handlePointerMove)
    this.root.removeEventListener('pointerup', this.#handlePointerUp)
    this.root.removeEventListener('pointercancel', this.#cancelPointer)
    this.#removeGhost()
    this.#interaction.destroy()
  }

  #handleDragStart = (event: DragEvent): void => {
    if (this.#pointerDrag) {
      event.preventDefault()
      return
    }
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-inventory-item], [data-mechanism-item]',
    )
    const itemId = element?.dataset.inventoryItem ?? element?.dataset.mechanismItem
    if (!element || !itemId || !event.dataTransfer) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-starwreck-item', itemId)
    element.dataset.dragging = 'true'
    this.#nativeDropped = false
    this.#interaction.begin(itemId)
  }

  #handleDragOver = (event: DragEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drop-target]')
    this.#interaction.hoverTarget(target?.dataset.dropTarget ?? null)
    if (target) {
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
    this.#nativeDropped = true
    this.#interaction.finish(this.#onUse(itemId, targetId))
  }

  #handleDragEnd = (): void => {
    this.root
      .querySelectorAll<HTMLElement>('[data-dragging]')
      .forEach((element) => delete element.dataset.dragging)
    if (!this.#nativeDropped) this.#interaction.finish(false)
    this.#nativeDropped = false
  }

  #handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-inventory-item], [data-mechanism-item]',
    )
    const itemId = element?.dataset.inventoryItem ?? element?.dataset.mechanismItem
    if (!element || !itemId) return
    this.#pointerDrag = {
      itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      source: element,
    }
    element.setPointerCapture(event.pointerId)
  }

  #handlePointerMove = (event: PointerEvent): void => {
    const drag = this.#pointerDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (distance < 8 && !drag.active) return
    if (!drag.active) {
      drag.active = true
      this.#interaction.begin(drag.itemId)
      this.#showGhost(drag.source, drag.itemId)
    }
    this.#moveGhost(event.clientX, event.clientY)
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-drop-target]')
    this.#interaction.hoverTarget(target?.dataset.dropTarget ?? null)
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
      const success = targetId ? this.#onUse(drag.itemId, targetId) : false
      this.#interaction.finish(success)
    } else {
      this.#interaction.cancel()
    }

    this.#removeGhost()
    this.#pointerDrag = null
  }

  #cancelPointer = (): void => {
    this.#interaction.cancel()
    this.#removeGhost()
    this.#pointerDrag = null
  }

  #showGhost(source: HTMLElement, itemId: string): void {
    this.#removeGhost()
    const ghost = document.createElement('div')
    ghost.className = 'inventory-drag-ghost'
    ghost.dataset.dragGhost = itemId
    const art = source.querySelector<HTMLElement>('.inventory-art')
    if (art) ghost.append(art.cloneNode(true))
    const label = source.querySelector<HTMLElement>('strong')?.textContent
    if (label) {
      const span = document.createElement('span')
      span.textContent = label
      ghost.append(span)
    }
    document.body.append(ghost)
    this.#dragGhost = ghost
  }

  #moveGhost(x: number, y: number): void {
    if (!this.#dragGhost) return
    this.#dragGhost.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`
  }

  #removeGhost(): void {
    this.#dragGhost?.remove()
    this.#dragGhost = null
  }
}
