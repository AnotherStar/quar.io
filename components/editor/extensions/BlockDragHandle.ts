// Notion-style block drag handle.
// Renders a floating "[+] [⋮⋮]" widget to the left of the block under the
// mouse cursor. The "+" button inserts an empty paragraph after the current
// block; the grip starts a drag that reorders blocks vertically.
//
// Drop indicator (a horizontal blue line) shows where the dragged block
// will land while the user is dragging.
//
// NOTE: this is the "Phase 1" implementation — vertical reorder only.
// Sideways-drop-creates-columns is a separate follow-up.
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

// ── Drop transactions ────────────────────────────────────────────────────────

function performVerticalDrop(
  view: EditorView,
  fromPos: number,
  fromNode: PMNode,
  targetPos: number,
  targetNode: PMNode,
  zone: 'top' | 'bottom'
) {
  let insertAt = zone === 'bottom' ? targetPos + targetNode.nodeSize : targetPos
  if (insertAt === fromPos || insertAt === fromPos + fromNode.nodeSize) return

  // Special case: source is the SOLE child of a column. Removing it would
  // leave an invalid column (`block+` requires ≥1). We do everything in one
  // transaction: replace the whole Columns wrapper with the surviving
  // columns (or dissolve to top level), and insert fromNode at target.
  const $from = view.state.doc.resolve(fromPos)
  let columnDepth = -1
  for (let d = $from.depth; d >= 1; d--) {
    if ($from.node(d).type.name === 'column') { columnDepth = d; break }
  }

  const tr = view.state.tr
  if (columnDepth >= 1) {
    const column = $from.node(columnDepth)
    if (column.childCount === 1) {
      const columnsDepth = columnDepth - 1
      const columnsNode = $from.node(columnsDepth)
      if (columnsNode.type.name === 'columns') {
        const columnIdx = $from.index(columnsDepth)
        const columnsPos = $from.before(columnsDepth)

        const remaining: PMNode[] = []
        columnsNode.forEach((col, _o, idx) => {
          if (idx !== columnIdx) remaining.push(col)
        })

        let replacementSize = 0
        if (remaining.length < 2) {
          // Dissolve: lift remaining column(s)' children up to top level
          const lifted: PMNode[] = []
          remaining.forEach((col) => col.content.forEach((c) => lifted.push(c)))
          tr.replaceWith(columnsPos, columnsPos + columnsNode.nodeSize, lifted)
          replacementSize = lifted.reduce((s, n) => s + n.nodeSize, 0)
        } else {
          const newCols = view.state.schema.nodes.columns.create(
            { columnWidths: remaining.map(() => Math.round((100 / remaining.length) * 100) / 100) },
            remaining
          )
          tr.replaceWith(columnsPos, columnsPos + columnsNode.nodeSize, newCols)
          replacementSize = newCols.nodeSize
        }

        const sizeDelta = replacementSize - columnsNode.nodeSize  // negative
        let adjustedInsert = insertAt
        if (insertAt >= columnsPos + columnsNode.nodeSize) adjustedInsert += sizeDelta
        else if (insertAt > columnsPos) adjustedInsert = columnsPos  // collapsed range — clamp to start
        tr.insert(adjustedInsert, fromNode)
        view.dispatch(tr)
        return
      }
    }
  }

  // Standard case
  tr.delete(fromPos, fromPos + fromNode.nodeSize)
  if (insertAt > fromPos) insertAt -= fromNode.nodeSize
  tr.insert(insertAt, fromNode)
  view.dispatch(tr)
  cleanupEmptyColumns(view)
}

// Sideways drop: wrap source + target into Columns, OR add a column to an
// existing Columns target.
function performSidewaysDrop(
  view: EditorView,
  fromPos: number,
  fromNode: PMNode,
  targetPos: number,
  targetNode: PMNode,
  zone: 'left' | 'right'
) {
  const schema = view.state.schema
  const columnsType = schema.nodes.columns
  const columnType = schema.nodes.column
  if (!columnsType || !columnType) return

  // Wrap fromNode into a column, or pass-through if it's already a column.
  const wrapInColumn = (n: PMNode) =>
    n.type.name === 'column' ? n : columnType.create(null, n)

  // Case A: target is Columns — extend it
  if (targetNode.type === columnsType) {
    const existingCols = targetNode.children
    if (existingCols.length >= 4) return    // schema cap
    const newCol = wrapInColumn(fromNode)
    const newCols = zone === 'left' ? [newCol, ...existingCols] : [...existingCols, newCol]

    // Recompute equal column widths after the insertion (lose any custom sizes)
    const widths = newCols.map(() => Math.round((100 / newCols.length) * 100) / 100)
    const newColumnsNode = columnsType.create({ columnWidths: widths }, newCols)

    // Apply: delete from, replace target with newColumnsNode (order matters)
    applyReplacePair(view, fromPos, fromNode.nodeSize, targetPos, targetNode.nodeSize, newColumnsNode)
    return
  }

  // Case B: plain target — wrap target + dragged into a 2-col Columns
  const colA = zone === 'left' ? wrapInColumn(fromNode) : wrapInColumn(targetNode)
  const colB = zone === 'left' ? wrapInColumn(targetNode) : wrapInColumn(fromNode)
  const newColumnsNode = columnsType.create({ columnWidths: [50, 50] }, [colA, colB])
  applyReplacePair(view, fromPos, fromNode.nodeSize, targetPos, targetNode.nodeSize, newColumnsNode)
}

// Atomic op: delete fromPos..fromPos+fromSize, then replace target range with `replacement`.
// Adjusts indices for whichever end of the doc shifts first.
function applyReplacePair(
  view: EditorView,
  fromPos: number,
  fromSize: number,
  targetPos: number,
  targetSize: number,
  replacement: PMNode
) {
  if (fromPos === targetPos) return
  const tr = view.state.tr
  if (fromPos < targetPos) {
    tr.delete(fromPos, fromPos + fromSize)
    tr.replaceWith(targetPos - fromSize, targetPos - fromSize + targetSize, replacement)
  } else {
    tr.replaceWith(targetPos, targetPos + targetSize, replacement)
    const adjustedFrom = fromPos + (replacement.nodeSize - targetSize)
    tr.delete(adjustedFrom, adjustedFrom + fromSize)
  }
  view.dispatch(tr)
  cleanupEmptyColumns(view)
}

// After a drop, scan top-level Columns nodes:
//   - If a column became empty, remove it
//   - If <2 columns remain, dissolve the Columns wrapper, lifting remaining
//     content back up to the doc level
// Re-runs until no more changes (cascade-safe).
function cleanupEmptyColumns(view: EditorView) {
  let attempts = 0
  // eslint-disable-next-line no-constant-condition
  while (attempts++ < 5) {
    const tr = view.state.tr
    let didChange = false
    view.state.doc.forEach((node, offset) => {
      if (didChange) return
      if (node.type.name !== 'columns') return
      const valid: PMNode[] = []
      node.forEach((col) => {
        if (col.type.name === 'column' && col.content.size > 0) valid.push(col)
      })
      if (valid.length === node.childCount) return  // nothing to fix

      if (valid.length < 2) {
        // Dissolve: replace the Columns wrapper with the inner blocks of any
        // surviving column(s) at top level.
        const replacement: PMNode[] = []
        valid.forEach((col) => col.content.forEach((c) => replacement.push(c)))
        tr.replaceWith(offset, offset + node.nodeSize, replacement.length ? replacement : [])
      } else {
        // Rebuild Columns with the surviving columns; widths re-balanced equally.
        const columnsType = view.state.schema.nodes.columns
        const newCols = columnsType.create(
          { columnWidths: valid.map(() => Math.round((100 / valid.length) * 100) / 100) },
          valid
        )
        tr.replaceWith(offset, offset + node.nodeSize, newCols)
      }
      didChange = true
    })
    if (!didChange) break
    view.dispatch(tr)
  }
}

export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',
  addProseMirrorPlugins() {
    return [createPlugin()]
  },
  addKeyboardShortcuts() {
    return {
      // Backspace in an empty block that is the SOLE child of its column.
      // Done in one transaction so PM doesn't auto-restore an invalid
      // (1-column) Columns into 2 columns by inserting an empty placeholder.
      Backspace: ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        if (!selection.empty) return false
        const $pos = selection.$from
        const block = $pos.parent
        if (block.content.size > 0) return false
        if ($pos.depth < 3) return false
        const column = $pos.node($pos.depth - 1)
        if (column.type.name !== 'column') return false
        if (column.childCount !== 1) return false
        const columnsNode = $pos.node($pos.depth - 2)
        if (columnsNode.type.name !== 'columns') return false

        const columnIdx = $pos.index($pos.depth - 2)
        const columnsPos = $pos.before($pos.depth - 2)

        // Build the surviving columns list
        const remaining: PMNode[] = []
        columnsNode.forEach((col, _offset, idx) => {
          if (idx !== columnIdx) remaining.push(col)
        })

        const tr = state.tr
        if (remaining.length < 2) {
          // Dissolve: lift remaining column(s)' children up to top level
          const replacement: PMNode[] = []
          remaining.forEach((col) => col.content.forEach((c) => replacement.push(c)))
          tr.replaceWith(columnsPos, columnsPos + columnsNode.nodeSize, replacement)
        } else {
          // Rebuild Columns with surviving columns; equal widths
          const newCols = state.schema.nodes.columns.create(
            { columnWidths: remaining.map(() => Math.round((100 / remaining.length) * 100) / 100) },
            remaining
          )
          tr.replaceWith(columnsPos, columnsPos + columnsNode.nodeSize, newCols)
        }
        view.dispatch(tr)
        return true
      }
    }
  }
})

function createPlugin() {
  return new Plugin({
    key: new PluginKey('blockDragHandle'),
    view(view: EditorView) {
      // ── Handle UI ──────────────────────────────────────────────────────
      // Mounted to <body> with position: fixed so its coordinates are pure
      // viewport coords — no offsetParent / transformed-ancestor surprises.
      const handle = document.createElement('div')
      handle.className = 'mo-block-handle'
      handle.contentEditable = 'false'
      handle.innerHTML = `
        <button type="button" class="mo-block-handle__btn mo-block-handle__add" title="Добавить блок ниже" aria-label="Добавить блок ниже">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button type="button" class="mo-block-handle__btn mo-block-handle__grip" draggable="true" title="Перетащить" aria-label="Перетащить блок">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
        </button>
      `
      document.body.appendChild(handle)

      const dropLine = document.createElement('div')
      dropLine.className = 'mo-block-droppos'
      document.body.appendChild(dropLine)

      // ── State ──────────────────────────────────────────────────────────
      let hoveredEl: HTMLElement | null = null
      let hoveredPos = -1
      let dragSourcePos = -1
      let dropTargetPos = -1
      let dropZone: 'top' | 'bottom' | 'left' | 'right' = 'bottom'

      const SIDE_ZONE_PX = 64       // dropping within this many px of L/R edge → sideways

      function clearDropLine() {
        dropLine.style.display = 'none'
        dropTargetPos = -1
      }

      // Find draggable block that contains the given DOM element. A draggable
      // block is one whose parent is either:
      //   - view.dom  (top-level block in the document)
      //   - .mo-column  (block inside a column)
      // Anything deeper (e.g. a list item) is intentionally not draggable.
      function findDraggableBlock(el: Element | null): HTMLElement | null {
        let cur = el as HTMLElement | null
        while (cur && cur !== view.dom) {
          const parent = cur.parentElement
          if (!parent) return null
          if (parent === view.dom) return cur
          if (parent.classList?.contains('mo-column')) return cur
          cur = parent
        }
        return null
      }

      function blockUnderPoint(x: number, y: number): { el: HTMLElement; pos: number } | null {
        const target = document.elementFromPoint(x, y)
        if (!target || !view.dom.contains(target)) return null
        const block = findDraggableBlock(target)
        if (!block) return null
        try {
          // bias=-1 → return the position immediately BEFORE the DOM node.
          // Works uniformly for text blocks AND atom nodes (image, section
          // ref, module ref) at any depth — no need to walk ancestor depths.
          const pos = view.posAtDOM(block, 0, -1)
          if (pos < 0) return null
          // Verify the resolved position points at a real block node — this
          // protects against weird edge cases where posAtDOM lands inside
          // text content for non-atom blocks.
          const $pos = view.state.doc.resolve(pos)
          const after = $pos.nodeAfter
          if (!after || !after.type.isBlock) {
            // Fall back to ancestor-walk for inside-text positions
            for (let d = $pos.depth; d >= 1; d--) {
              const parentName = $pos.node(d - 1).type.name
              if (parentName === 'doc' || parentName === 'column') {
                return { el: block, pos: $pos.before(d) }
              }
            }
            return null
          }
          return { el: block, pos }
        } catch {}
        return null
      }

      // True if the position lives inside a `column` node (any depth).
      function isInsideColumn(pos: number): boolean {
        return enclosingColumnPos(pos) !== null
      }

      // Position before the nearest enclosing `column` ancestor of `pos`,
      // or null if not inside any column.
      function enclosingColumnPos(pos: number): number | null {
        try {
          const $pos = view.state.doc.resolve(pos)
          for (let d = $pos.depth; d >= 1; d--) {
            if ($pos.node(d).type.name === 'column') return $pos.before(d)
          }
        } catch {}
        return null
      }

      function showHandle(blockEl: HTMLElement, pos: number) {
        hoveredEl = blockEl
        hoveredPos = pos
        const blockRect = blockEl.getBoundingClientRect()
        const inColumn = blockEl.parentElement?.classList?.contains('mo-column')
        if (inColumn) {
          // For column children, the gap (~20px) is too narrow to fit the
          // handle to the left without intruding into the neighbouring column.
          // Float it ABOVE the block, aligned with its left edge — same idea
          // as Notion's drag handle for column items.
          handle.style.top = `${blockRect.top - 22}px`
          handle.style.left = `${blockRect.left}px`
        } else {
          // Top-level block: place to the left of the block, vertically
          // aligned with the first text line.
          const lineHeight = parseFloat(getComputedStyle(blockEl).lineHeight) || 24
          const verticalCenter = blockRect.top + Math.min(lineHeight, blockRect.height) / 2
          handle.style.top = `${verticalCenter - 11}px`
          handle.style.left = `${blockRect.left - 48}px`
        }
        handle.classList.add('mo-block-handle--visible')
      }

      function hideHandle() {
        handle.classList.remove('mo-block-handle--visible')
        hoveredEl = null
        hoveredPos = -1
      }

      // ── Hover tracking ─────────────────────────────────────────────────
      let hideTimer: ReturnType<typeof setTimeout> | null = null
      const onMouseMove = (e: MouseEvent) => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
        // Don't retarget while hovering the column resize handle —
        // its parent is .mo-columns, which would make us select the whole
        // Columns wrapper as the draggable block.
        const target = e.target as Element | null
        if (target?.closest?.('.mo-column-resizer')) return
        const block = blockUnderPoint(e.clientX, e.clientY)
        if (block) showHandle(block.el, block.pos)
      }
      const onMouseLeave = () => {
        hideTimer = setTimeout(() => {
          if (!handle.matches(':hover')) hideHandle()
        }, 150)
      }
      view.dom.addEventListener('mousemove', onMouseMove)
      view.dom.addEventListener('mouseleave', onMouseLeave)
      handle.addEventListener('mouseleave', onMouseLeave)

      // ── + button: insert paragraph after current block ─────────────────
      handle.querySelector('.mo-block-handle__add')?.addEventListener('click', () => {
        if (hoveredPos < 0) return
        const $pos = view.state.doc.resolve(hoveredPos)
        const node = $pos.nodeAfter
        if (!node) return
        const after = hoveredPos + node.nodeSize
        const tr = view.state.tr
        const para = view.state.schema.nodes.paragraph?.create()
        if (!para) return
        tr.insert(after, para)
        // Position selection inside the new paragraph
        tr.setSelection(NodeSelection.create(tr.doc, after))
        view.dispatch(tr)
        view.focus()
      })

      // ── Drag handling ──────────────────────────────────────────────────
      const grip = handle.querySelector('.mo-block-handle__grip') as HTMLElement
      grip.addEventListener('dragstart', (e: DragEvent) => {
        if (hoveredPos < 0 || !hoveredEl) { e.preventDefault(); return }
        const $pos = view.state.doc.resolve(hoveredPos)
        const node = $pos.nodeAfter
        if (!node) { e.preventDefault(); return }
        dragSourcePos = hoveredPos

        // Make PM aware of the drag so the drop is handled as a node move,
        // not a paste of foreign content.
        const slice = view.state.doc.slice(hoveredPos, hoveredPos + node.nodeSize)
        ;(view as any).dragging = { slice, move: true }

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move'
          // Some browsers refuse drag without setData
          e.dataTransfer.setData('text/plain', '')
          // Use the block element as drag image (looks nicer than the handle)
          e.dataTransfer.setDragImage(hoveredEl, 10, 10)
        }
        document.body.classList.add('mo-dragging-block')
      })

      grip.addEventListener('dragend', () => {
        document.body.classList.remove('mo-dragging-block')
        ;(view as any).dragging = null
        dragSourcePos = -1
        clearDropLine()
      })

      // While dragging anywhere over the editor, paint a drop line at the
      // closest TOP-LEVEL block boundary above/below the cursor.
      // We use capture phase so we run BEFORE ProseMirror's own dragover
      // (which would draw a drop cursor into nested content like paragraphs
      // inside columns or section refs).
      const onDragOver = (e: DragEvent) => {
        if (dragSourcePos < 0) return
        e.preventDefault()
        e.stopImmediatePropagation()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
        const block = blockUnderPoint(e.clientX, e.clientY)
        if (!block) { clearDropLine(); return }

        if (block.pos === dragSourcePos) { clearDropLine(); return }

        const $from = view.state.doc.resolve(dragSourcePos)
        const fromNode = $from.nodeAfter
        const $target = view.state.doc.resolve(block.pos)
        const targetNode = $target.nodeAfter
        const fromIsColumns = fromNode?.type.name === 'columns'
        const fromColPos = enclosingColumnPos(dragSourcePos)
        const targetColPos = enclosingColumnPos(block.pos)
        const fromInColumn = fromColPos !== null
        const targetInColumn = targetColPos !== null
        const targetIsEmpty = !targetNode || targetNode.content.size === 0
        const sameColumn = fromInColumn && fromColPos === targetColPos

        // Vertical drop INTO a column is only allowed when source is in the
        // same column (i.e. reordering within one column). Drops from outside
        // would silently move text into a column the user didn't intend to
        // edit; if they want columns, they should sideways-drop.
        if (targetInColumn && !sameColumn) {
          clearDropLine()
          return
        }

        // Sideways drop only when source/target are both top-level, source
        // isn't already Columns, and the target isn't an empty placeholder.
        const allowSideways = !fromIsColumns && !fromInColumn && !targetInColumn && !targetIsEmpty

        const rect = block.el.getBoundingClientRect()
        const distLeft = e.clientX - rect.left
        const distRight = rect.right - e.clientX
        let zone: typeof dropZone
        if (allowSideways && distLeft < SIDE_ZONE_PX) zone = 'left'
        else if (allowSideways && distRight < SIDE_ZONE_PX) zone = 'right'
        else zone = e.clientY > rect.top + rect.height / 2 ? 'bottom' : 'top'

        dropTargetPos = block.pos
        dropZone = zone
        dropLine.style.display = 'block'
        if (zone === 'top' || zone === 'bottom') {
          const y = zone === 'bottom' ? rect.bottom : rect.top
          dropLine.style.top = `${y - 1}px`
          dropLine.style.left = `${rect.left}px`
          dropLine.style.width = `${rect.width}px`
          dropLine.style.height = `3px`
        } else {
          const x = zone === 'right' ? rect.right : rect.left
          dropLine.style.top = `${rect.top}px`
          dropLine.style.left = `${x - 1}px`
          dropLine.style.width = `3px`
          dropLine.style.height = `${rect.height}px`
        }
      }
      view.dom.addEventListener('dragover', onDragOver, { capture: true })

      const onDrop = (e: DragEvent) => {
        if (dragSourcePos < 0) return
        e.preventDefault()
        e.stopImmediatePropagation()

        const fromPos = dragSourcePos
        const $from = view.state.doc.resolve(fromPos)
        const fromNode = $from.nodeAfter
        if (!fromNode || dropTargetPos < 0) { clearDropLine(); return }

        const $target = view.state.doc.resolve(dropTargetPos)
        const targetNode = $target.nodeAfter
        if (!targetNode) { clearDropLine(); return }

        const sideways = dropZone === 'left' || dropZone === 'right'
        if (sideways) {
          performSidewaysDrop(view, fromPos, fromNode, dropTargetPos, targetNode, dropZone)
        } else {
          performVerticalDrop(view, fromPos, fromNode, dropTargetPos, targetNode, dropZone)
        }
        clearDropLine()
        ;(view as any).dragging = null
        dragSourcePos = -1
      }
      // Capture phase ensures we preempt ProseMirror's native drop handler.
      view.dom.addEventListener('drop', onDrop, { capture: true })

      return {
        destroy() {
          view.dom.removeEventListener('mousemove', onMouseMove)
          view.dom.removeEventListener('mouseleave', onMouseLeave)
          view.dom.removeEventListener('dragover', onDragOver, { capture: true } as any)
          view.dom.removeEventListener('drop', onDrop, { capture: true } as any)
          handle.remove()
          dropLine.remove()
        }
      }
    }
  })
}
