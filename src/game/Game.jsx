import { useCallback, useEffect, useRef, useState } from 'react'
import { CANVAS_H, CANVAS_W, MARGIN, START, TILE, drawObject, drawRoom, isBlocked, objectAt, objects, roomState } from './room'
import { drawBuddy, drawPlayer } from './sprites'

const W = CANVAS_W
const H = CANVAS_H
const FURNITURE = objects.filter((o) => !o.flat)
const BED = objects.find((o) => o.id === 'bed')
const HUG_WAIT = 10 // seconds standing still by the bed
const HUG_JUMP = 0.6 // seconds for Plum's hop onto the bed
const SPEED = 80 // px per second
const TYPE_MS = 25
const FOLLOW_GAP = 16 // how far (path length, px) the buddy trails behind
const BUDDY_LINES = [
  ['Plum waddles in a happy circle.', 'Pip pip!'],
  ['Plum puffs up its feathers proudly.'],
  ['Plum is staring at the TV.', 'It wants to play games.'],
  ['Plum nuzzles your leg.', 'Pip...'],
]
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
}
const ACTION_KEYS = new Set(['z', 'Enter', ' '])

function calcScale() {
  const touch = window.matchMedia('(pointer: coarse)').matches
  const sx = (window.innerWidth - 32) / W
  const sy = (window.innerHeight - (touch ? 240 : 120)) / H
  return Math.max(1, Math.floor(Math.min(sx, sy)))
}

export default function Game() {
  const canvasRef = useRef(null)
  const held = useRef([])
  // x/y = top-left pixel of the 16x16 footprint (room space)
  const player = useRef({ x: START.x * TILE, y: START.y * TILE, dir: START.dir, moving: false, dist: 0, tile: `${START.x},${START.y}` })
  const [dialogue, setDialogue] = useState(null) // { pages, page }
  const [chars, setChars] = useState(0)
  const [scale, setScale] = useState(calcScale)
  const dialogueRef = useRef(null)
  const charsRef = useRef(0)
  // buddy follows the exact path the player walked, FOLLOW_GAP px behind
  const buddy = useRef({ x: START.x * TILE, y: (START.y - 1) * TILE, dir: 'down', dist: 0, moving: false, talk: 0 })
  const hug = useRef(null) // { t, homeX, homeY } while Plum is hopping/hugging
  const idle = useRef(0)
  const trail = useRef({
    points: [
      { x: START.x * TILE, y: (START.y - 1) * TILE, d: 0 },
      { x: START.x * TILE, y: START.y * TILE, d: FOLLOW_GAP },
    ],
    total: FOLLOW_GAP,
  })

  useEffect(() => {
    dialogueRef.current = dialogue
    charsRef.current = chars
  }, [dialogue, chars])

  const openDialogue = useCallback((pages) => {
    dialogueRef.current = { pages, page: 0 }
    setDialogue({ pages, page: 0 })
    setChars(0)
  }, [])

  const action = useCallback(() => {
    const d = dialogueRef.current
    if (d) {
      const text = d.pages[d.page]
      if (charsRef.current < text.length) {
        setChars(text.length)
      } else if (d.page + 1 < d.pages.length) {
        setDialogue({ ...d, page: d.page + 1 })
        setChars(0)
      } else {
        dialogueRef.current = null
        setDialogue(null)
      }
      return
    }
    const p = player.current
    const [dx, dy] = DIRS[p.dir]
    const fx = p.x + 8 + dx * 12
    const fy = p.y + 11 + dy * 12
    const b = buddy.current
    if (fx >= b.x && fx < b.x + TILE && fy >= b.y && fy < b.y + TILE) {
      openDialogue(BUDDY_LINES[b.talk++ % BUDDY_LINES.length])
      return
    }
    const obj = objectAt(Math.floor(fx / TILE), Math.floor(fy / TILE))
    if (obj?.text) openDialogue(roomState.hugging && obj.hugText ? obj.hugText : obj.text)
  }, [openDialogue])

  // typewriter
  useEffect(() => {
    if (!dialogue) return
    const len = dialogue.pages[dialogue.page].length
    const id = setInterval(() => setChars((c) => (c >= len ? c : c + 1)), TYPE_MS)
    return () => clearInterval(id)
  }, [dialogue])

  // input
  useEffect(() => {
    const press = (dir) => {
      if (!held.current.includes(dir)) held.current.push(dir)
    }
    const release = (dir) => {
      held.current = held.current.filter((d) => d !== dir)
    }
    const onDown = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (KEYMAP[key]) {
        e.preventDefault()
        press(KEYMAP[key])
      } else if (ACTION_KEYS.has(key)) {
        e.preventDefault()
        if (!e.repeat) action()
      }
    }
    const onUp = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (KEYMAP[key]) release(KEYMAP[key])
    }
    const onBlur = () => (held.current = [])
    const onResize = () => setScale(calcScale())
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
    }
  }, [action])

  // game loop
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    const bg = document.createElement('canvas')
    bg.width = W
    bg.height = H
    drawRoom(bg.getContext('2d'))

    // feet hitbox inside the 16x16 footprint
    const HIT = { l: 3, r: 12, t: 8, b: 15 }
    const blockedAt = (x, y) => {
      const xs = [x + HIT.l, x + HIT.r]
      const ys = [y + HIT.t, y + HIT.b]
      return xs.some((px) => ys.some((py) => isBlocked(Math.floor(px / TILE), Math.floor(py / TILE))))
    }
    // move along one axis in <=1px steps, stopping at walls
    const slide = (p, ax, amount) => {
      const sign = Math.sign(amount)
      let left = Math.abs(amount)
      let moved = 0
      while (left > 0) {
        const step = Math.min(1, left) * sign
        const nx = ax === 'x' ? p.x + step : p.x
        const ny = ax === 'y' ? p.y + step : p.y
        if (blockedAt(nx, ny)) break
        p.x = nx
        p.y = ny
        moved += Math.abs(step)
        left -= 1
      }
      return moved
    }
    // corner sliding: only when blocked, and only if an opening is a few px to the side
    const nudge = (p, dir, amount) => {
      const [dx, dy] = DIRS[dir]
      const cross = dx ? 'y' : 'x'
      for (let off = 1; off <= 6; off++) {
        for (const sgn of [-1, 1]) {
          const ox = cross === 'x' ? sgn * off : 0
          const oy = cross === 'y' ? sgn * off : 0
          if (!blockedAt(p.x + ox, p.y + oy) && !blockedAt(p.x + ox + dx, p.y + oy + dy)) {
            return slide(p, cross, sgn * Math.min(off, amount))
          }
        }
      }
      return 0
    }

    let raf
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = player.current
      const dir = held.current[held.current.length - 1]
      p.moving = false
      if (dir && !dialogueRef.current) {
        p.dir = dir
        const [dx, dy] = DIRS[dir]
        const amount = SPEED * dt
        let moved = dx ? slide(p, 'x', dx * amount) : slide(p, 'y', dy * amount)
        if (moved === 0) moved = nudge(p, dir, amount)
        if (moved > 0) {
          p.moving = true
          p.dist += moved
        }
        const tx = Math.floor((p.x + 8) / TILE)
        const ty = Math.floor((p.y + 11) / TILE)
        const key = `${tx},${ty}`
        if (key !== p.tile) {
          p.tile = key
          const obj = objectAt(tx, ty)
          if (obj?.onStep) openDialogue(obj.onStep)
        }
      }
      // stand still next to the bed for HUG_WAIT seconds -> Plum hops up for a hug; moving breaks it
      const b = buddy.current
      const ptx = Math.floor((p.x + 8) / TILE)
      const pty = Math.floor((p.y + 11) / TILE)
      const nearBed = ptx >= BED.x - 1 && ptx <= BED.x + BED.w && pty >= BED.y - 1 && pty <= BED.y + BED.h
      if (p.moving || !nearBed) {
        idle.current = 0
        if (hug.current) {
          b.x = hug.current.homeX
          b.y = hug.current.homeY
          hug.current = null
          roomState.hugging = false
        }
      } else if (hug.current) {
        hug.current.t += dt
      } else if (!dialogueRef.current) {
        idle.current += dt
        if (idle.current >= HUG_WAIT) hug.current = { t: 0, homeX: b.x, homeY: b.y }
      }

      // record the player's path and place the buddy FOLLOW_GAP behind on it
      const tr = trail.current
      const lastPt = tr.points[tr.points.length - 1]
      const seg = Math.abs(p.x - lastPt.x) + Math.abs(p.y - lastPt.y)
      b.moving = false
      if (seg > 0) {
        tr.total += seg
        tr.points.push({ x: p.x, y: p.y, d: tr.total })
        const want = tr.total - FOLLOW_GAP
        let i = tr.points.length - 1
        while (i > 0 && tr.points[i - 1].d > want) i--
        const a = tr.points[Math.max(0, i - 1)]
        const c = tr.points[i]
        const t = c.d === a.d ? 1 : Math.min(1, Math.max(0, (want - a.d) / (c.d - a.d)))
        const nx = a.x + (c.x - a.x) * t
        const ny = a.y + (c.y - a.y) * t
        const mx = nx - b.x
        const my = ny - b.y
        if (mx || my) {
          b.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : my > 0 ? 'down' : 'up'
          b.dist += Math.abs(mx) + Math.abs(my)
          b.moving = true
        }
        b.x = nx
        b.y = ny
        if (i > 2) tr.points.splice(0, i - 2)
      }

      const px = Math.round(p.x)
      const py = Math.round(p.y)
      const anim = p.moving ? ['walkA', 'stand', 'walkB', 'stand'][Math.floor(p.dist / 7) % 4] : 'stand'
      let bx = Math.round(b.x)
      let by = Math.round(b.y)
      let bDir = b.dir
      let bStep = b.moving ? Math.floor(b.dist / 6) % 2 : 0
      let bBottom = by + TILE - 0.25
      const h = hug.current
      const hugX = BED.x * TILE + 8
      const hugY = BED.y * TILE + 15
      if (h) {
        // blocky hop: position snapped to 2px, arc over the bed edge
        const k = Math.min(1, h.t / HUG_JUMP)
        const snap = (v) => Math.round(v / 2) * 2
        bx = snap(h.homeX + (hugX - h.homeX) * k)
        by = snap(h.homeY + (hugY - h.homeY) * k - Math.sin(Math.PI * k) * 16)
        bDir = k < 1 ? (hugX >= h.homeX ? 'right' : 'left') : 'up'
        bStep = k < 1 ? 1 : Math.floor(h.t * 4) % 2
        bBottom = (BED.y + BED.h) * TILE + 1 // on top of the bed
        roomState.hugging = k >= 1
      }

      // depth sort by bottom edge; furniture wins ties so you walk in front of what you're touching
      const drawables = FURNITURE.map((o) => ({ bottom: (o.y + o.h) * TILE - 0.5, draw: () => drawObject(ctx, o) }))
      drawables.push({ bottom: py + TILE, draw: () => drawPlayer(ctx, px + MARGIN, py + MARGIN, p.dir, anim) })
      drawables.push({ bottom: bBottom, draw: () => drawBuddy(ctx, bx + MARGIN, by + MARGIN, bDir, bStep) })
      drawables.sort((m, n) => m.bottom - n.bottom)
      ctx.drawImage(bg, 0, 0)
      for (const d of drawables) d.draw()

      // hearts float up while hugging
      if (roomState.hugging) {
        const HEART = ['.x.x.', 'xxxxx', '.xxx.', '..x..']
        for (let i = 0; i < 3; i++) {
          const ph = (h.t * 0.7 + i / 3) % 1
          if (ph > 0.85) continue
          const hx = hugX + MARGIN + 1 + i * 5
          const hy = Math.round(hugY + MARGIN - 2 - ph * 18)
          ctx.fillStyle = i === 1 ? '#ff8fb4' : '#ff5a8a'
          HEART.forEach((row, j) => [...row].forEach((ch, k) => ch === 'x' && ctx.fillRect(hx + k, hy + j, 1, 1)))
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [openDialogue])

  const padProps = (dir) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      if (!held.current.includes(dir)) held.current.push(dir)
    },
    onPointerUp: () => (held.current = held.current.filter((d) => d !== dir)),
    onPointerLeave: () => (held.current = held.current.filter((d) => d !== dir)),
    onPointerCancel: () => (held.current = held.current.filter((d) => d !== dir)),
  })

  const text = dialogue ? dialogue.pages[dialogue.page] : ''
  const done = dialogue && chars >= text.length

  return (
    <div className="game">
      <div className="screen" style={{ '--s': scale }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />
        {dialogue && (
          <div className="dialogue" onClick={action}>
            {text.slice(0, chars)}
            {done && <span className="next">▼</span>}
          </div>
        )}
      </div>

      <p className="hint">Arrows / WASD to move · Z / Enter to interact</p>

      <div className="touch">
        <div className="dpad">
          <button className="up" aria-label="Up" {...padProps('up')} />
          <button className="left" aria-label="Left" {...padProps('left')} />
          <button className="right" aria-label="Right" {...padProps('right')} />
          <button className="down" aria-label="Down" {...padProps('down')} />
        </div>
        <button
          className="a"
          aria-label="Interact"
          onPointerDown={(e) => {
            e.preventDefault()
            action()
          }}
        >
          A
        </button>
      </div>
    </div>
  )
}
