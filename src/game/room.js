export const TILE = 16
export const COLS = 12
export const ROWS = 11
export const MARGIN = 12 // black void around the room
const WALL_ROWS = 3
const W = COLS * TILE
const H = ROWS * TILE
const WALL_H = WALL_ROWS * TILE

export const CANVAS_W = W + MARGIN * 2
export const CANVAS_H = H + MARGIN * 2

export const START = { x: 6, y: 8, dir: 'down' }

// live scene flags the game loop flips (e.g. Plum hugging the girl in bed)
export const roomState = { hugging: false }

// ---------- palettes ----------
// box palettes: o outline, top/hi top face, front/sh front face, side, lip (top-front edge)
const WOOD = { o: '#4a2c1c', top: '#cf965c', hi: '#e8b47a', front: '#a8703f', sh: '#875630', side: '#7a4c2a', dark: '#5c3620', lite: '#bc844f' }
const PAINT = { o: '#4c4658', top: '#fdfaf2', hi: '#ffffff', front: '#e6e0d4', sh: '#cfc7b8', side: '#bdb4a6', lip: '#ffffff', in: '#a89f94', inDark: '#8a8178' }
const TEAL = { o: '#1c3a40', top: '#6cc4bc', hi: '#9ae2d8', front: '#3f9490', sh: '#2f7674', side: '#2a6464', lip: '#86d8cc', in: '#1f4c50', inDark: '#163a3e' }
const TVBOX = { o: '#16161e', top: '#74748a', hi: '#9494aa', front: '#55556a', sh: '#45455a', side: '#3a3a4c', lip: '#8a8aa0' }
const BEIGE = { o: '#4a4650', top: '#faf4e4', hi: '#ffffff', front: '#e8dec6', sh: '#d4c8ac', side: '#c4b698', lip: '#fffaee' }
const SHEET = { o: '#6e6684', top: '#f8f4ec', hi: '#ffffff', front: '#e0dbe8', sh: '#cec8d8', side: '#c6bed4', lip: '#ffffff' }
const SHADOW = 'rgba(40,30,60,0.22)'

// deterministic noise so the floor texture is stable
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// R draws a rect in room space (offset by MARGIN)
const painter = (ctx) => (x, y, w, h, c) => {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x) + MARGIN, Math.round(y) + MARGIN, Math.round(w), Math.round(h))
}

// ---------- shape helpers ----------
function rr(R, x, y, w, h, rad, c) {
  rad = Math.min(rad, Math.floor(w / 2), Math.floor(h / 2))
  for (let j = 0; j < h; j++) {
    let inset = 0
    const d = j < rad ? rad - j - 0.5 : j >= h - rad ? j - (h - rad) + 0.5 : -1
    if (d >= 0) inset = Math.round(rad - Math.sqrt(Math.max(0, rad * rad - d * d)))
    R(x + inset, y + j, w - inset * 2, 1, c)
  }
}
function orr(R, x, y, w, h, rad, o, c) {
  rr(R, x, y, w, h, rad, o)
  rr(R, x + 1, y + 1, w - 2, h - 2, Math.max(0, rad - 1), c)
}
function ell(R, cx, cy, rx, ry, c) {
  for (let j = 0; j < ry * 2; j++) {
    const d = (j + 0.5 - ry) / ry
    const half = rx * Math.sqrt(Math.max(0, 1 - d * d))
    const x0 = Math.round(cx - half)
    R(x0, cy - ry + j, Math.round(cx + half) - x0, 1, c)
  }
}
function oell(R, cx, cy, rx, ry, o, c) {
  ell(R, cx, cy, rx, ry, o)
  ell(R, cx, cy, rx - 1, ry - 1, c)
}

// blit a pixel map ('|' separators ignored, '.' transparent)
function pix(R, x, y, rows, pal) {
  rows.forEach((row, j) => {
    ;[...row.replaceAll('|', '')].forEach((ch, i) => {
      if (pal[ch]) R(x + i, y + j, 1, 1, pal[ch])
    })
  })
}

// girl lying in bed on her phone: head on the pillow, arms + phone above the quilt
const GIRL_PAL = {
  o: '#2a1a1e', h: '#3a2218', H: '#6a4430', s: '#a8683f', S: '#87502e', e: '#1e1218',
  r: '#c4705a', m: '#6e3428', t: '#f08cb0', T: '#c86890', p: '#34344a', k: '#9a9ab0',
}
const GIRL_HEAD = [
  '....|.ooo|ooo.|....',
  '...o|hhHH|hhhh|o...',
  '..oh|hHHh|hhhh|ho..',
  '.ohh|hhhh|hhhh|hho.',
  '.ohh|hhss|sshh|hho.',
  'ohhs|ssss|ssss|shho',
  'ohhs|eess|ssee|shho',
  'ohhs|rsss|sssr|shho',
  '.ohS|sssm|msss|Sho.',
  '.ohh|oSss|ssSo|hho.',
]
const GIRL_ARMS = [
  '....|.ooo|ooo.|....',
  '...o|sopp|kpos|o...',
  '..ot|sopp|ppos|to..',
  '..ot|tSoo|ooSt|To..',
  '..ot|tttt|tttt|To..',
  '...o|TTTT|TTTT|o...',
]

/**
 * Oblique 3D box. Front face is w×h at (x, y+t). The top face is t rows tall and
 * recedes up-right by d px; the right side face is d px wide. Outlined, with a lit
 * top-front lip, a highlight on the back edge and ambient occlusion at the base.
 */
function box(R, x, y, w, t, h, d, c) {
  const shift = (j) => (t > 1 ? Math.round((d * (t - 1 - j)) / (t - 1)) : 0)
  const lift = (k) => (d > 0 ? Math.round(((k + 1) * (t - 1)) / d) : 0)
  const shape = (ox, oy, top, front, side) => {
    for (let k = 0; k < d; k++) R(x + w + k + ox, y + t - lift(k) + oy, 1, h, side)
    R(x + ox, y + t + oy, w, h, front)
    for (let j = 0; j < t; j++) R(x + shift(j) + ox, y + j + oy, w, 1, top)
  }
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) shape(ox, oy, c.o, c.o, c.o)
  shape(0, 0, c.top, c.front, c.side)
  if (t > 0) R(x + shift(0), y, w, 1, c.hi)
  R(x, y + t, w, 1, c.lip ?? c.hi)
  R(x, y + t + h - 2, w, 2, c.sh)
  for (let k = 0; k < d; k++) R(x + w + k, y + t + h - lift(k) - 2, 1, 2, 'rgba(0,0,0,0.15)')
  return { fx: x, fy: y + t, fw: w, fh: h }
}

// recessed opening on a front face (shaded top/left inner walls = depth)
function recess(R, x, y, w, h, c) {
  rr(R, x, y, w, h, 1, c.o)
  R(x + 1, y + 1, w - 2, h - 2, c.in)
  R(x + 1, y + 1, w - 2, 2, c.inDark)
  R(x + 1, y + 1, 1, h - 2, c.inDark)
}

// x/y/w/h are tiles. `text` = shown when facing it + A. `onStep` = shown when walked onto.
// `flat` objects are floor decals drawn under everything.
export const objects = [
  {
    id: 'rug', x: 4, y: 6, w: 4, h: 3, flat: true,
    draw(R, x, y) {
      const cx = x + 32
      const cy = y + 24
      ell(R, cx, cy + 1, 31, 22, 'rgba(70,35,15,0.15)')
      ell(R, cx, cy, 31, 22, '#8a4c48')
      ell(R, cx, cy, 30, 21, '#c8705e')
      ell(R, cx, cy, 27, 18, '#f2d6b0')
      ell(R, cx, cy, 25, 16, '#d88a70')
      ell(R, cx, cy, 24, 15, '#f6e0bc')
      for (let a = 0; a < 16; a++) {
        const t = (a / 16) * Math.PI * 2
        const px = cx + Math.cos(t) * 19.5
        const py = cy + Math.sin(t) * 11.5
        ell(R, Math.round(px), Math.round(py), 2, 2, '#e8a888')
        R(Math.round(px) - 0.5, Math.round(py) - 1, 1, 1, '#f8ead0')
      }
      ell(R, cx, cy, 11, 7, '#d88a70')
      ell(R, cx, cy, 10, 6, '#7aa0c8')
      ell(R, cx, cy, 7, 4, '#a4c4e4')
      ell(R, cx - 1, cy - 1, 3, 2, '#d0e2f4')
      ell(R, cx - 12, cy - 13, 6, 2, 'rgba(255,255,255,0.18)')
    },
  },
  {
    id: 'doormat', x: 5, y: 10, w: 2, h: 1, flat: true,
    onStep: ['The door leads outside.', '(Contact links coming soon!)'],
    draw(R, x, y) {
      orr(R, x + 3, y + 2, 26, 12, 4, '#2c4a50', '#4f9a96')
      rr(R, x + 5, y + 4, 22, 8, 3, '#3f8480')
      rr(R, x + 6, y + 5, 20, 6, 2, '#5cb0aa')
      R(x + 9, y + 7, 14, 2, '#3f8480')
    },
  },
  {
    id: 'bookshelf', x: 0, y: 2, w: 2, h: 2, solid: true,
    text: ['A shelf packed with programming books.', '(Skills coming soon!)'],
    draw(R, x, y) {
      R(x + 3, y + 32, 30, 2, SHADOW)
      // globe on top
      R(x + 9, y - 13, 6, 2, '#4c4658')
      R(x + 11, y - 15, 2, 3, '#8a8090')
      oell(R, x + 12, y - 20, 5, 5, '#24345a', '#5a9ad8')
      ell(R, x + 10, y - 21, 2, 2, '#7cc46a')
      ell(R, x + 14, y - 19, 2, 1, '#7cc46a')
      R(x + 9, y - 23, 2, 1, '#bcdcf8')
      const f = box(R, x + 1, y - 12, 27, 5, 37, 3, PAINT)
      const books = ['#e07070', '#6a94dc', '#8ccc7c', '#f0c860', '#ac84d4', '#ec9a6c', '#5cb4ac']
      const widths = [3, 2, 3, 4, 2, 3, 2, 3]
      ;[[2, 10], [14, 9], [25, 9]].forEach(([top, h], shelf) => {
        const sy = f.fy + top
        recess(R, f.fx + 2, sy, f.fw - 4, h, PAINT)
        let bx = f.fx + 4
        let i = shelf * 3
        while (bx < f.fx + f.fw - 4) {
          const w = Math.min(widths[i % widths.length], f.fx + f.fw - 3 - bx)
          const bh = h - 3 - (i % 4 === 1 ? 2 : i % 5 === 0 ? 1 : 0)
          const c = books[i % books.length]
          const by = sy + h - 1 - bh
          R(bx, by + 1, w, bh, c)
          R(bx + (w > 2 ? 1 : 0), by, w > 2 ? w - 2 : w, 1, c)
          R(bx, by + 1, 1, bh, 'rgba(255,255,255,0.35)')
          if (w > 2) R(bx + w - 1, by + 1, 1, bh, 'rgba(0,0,0,0.18)')
          if (w > 2) R(bx + 1, by + 3, w - 2, 1, 'rgba(255,255,255,0.5)')
          bx += w
          i++
        }
      })
    },
  },
  {
    id: 'window', x: 3, y: 1, w: 2, h: 2, solid: true,
    text: ['A view of the town.', 'The clock tower is ringing.'],
    draw(R, x, y0) {
      const y = y0 - 10
      orr(R, x + 2, y + 5, 28, 23, 4, '#6a7090', '#ffffff')
      const gx = x + 4
      const gy = y + 7
      // sky
      rr(R, gx, gy, 24, 19, 3, '#9cd4f0')
      R(gx, gy + 8, 24, 4, '#b8e2f4')
      ell(R, gx + 18, gy + 3, 3, 1, '#ffffff')
      ell(R, gx + 15, gy + 4, 2, 1, '#ffffff')
      ell(R, gx + 4, gy + 4, 2, 1, '#e8f6fc')
      // distant hills
      ell(R, gx + 5, gy + 14, 9, 4, '#a8d890')
      ell(R, gx + 19, gy + 13, 9, 5, '#94cc80')
      const roof = (cx, top, h, c, dark) => {
        for (let j = 0; j < h; j++) {
          R(cx - j, top + j, j * 2 + 1, 1, c)
          R(cx + j, top + j, 1, 1, dark)
        }
      }
      // clock tower
      R(gx + 10, gy + 5, 4, 10, '#ece4d4')
      R(gx + 13, gy + 5, 1, 10, '#c8bca8')
      roof(gx + 12, gy + 1, 4, '#6a7ad0', '#4a58a8')
      R(gx + 11, gy + 6, 2, 2, '#fff4c0')
      R(gx + 12, gy + 6, 1, 1, '#8a7a5a')
      // houses
      R(gx + 1, gy + 12, 7, 5, '#f6eedc')
      roof(gx + 4, gy + 8, 4, '#e06058', '#b04040')
      R(gx + 2, gy + 13, 2, 2, '#5a7ab0')
      R(gx + 5, gy + 14, 2, 3, '#8a5a3a')
      R(gx + 15, gy + 11, 8, 6, '#fbf4e4')
      roof(gx + 19, gy + 7, 4, '#f0a040', '#c07828')
      R(gx + 16, gy + 12, 2, 2, '#5a7ab0')
      R(gx + 20, gy + 12, 2, 2, '#5a7ab0')
      R(gx + 18, gy + 14, 2, 3, '#8a5a3a')
      R(gx + 9, gy + 14, 6, 3, '#e8e0f0')
      roof(gx + 12, gy + 12, 2, '#5aa0a0', '#3a7878')
      // trees + street
      oell(R, gx + 1, gy + 15, 2, 2, '#2c6a34', '#5aaa4a')
      oell(R, gx + 23, gy + 15, 2, 2, '#2c6a34', '#5aaa4a')
      R(gx, gy + 17, 24, 1, '#86c474')
      rr(R, gx, gy + 17, 24, 2, 1, '#86c474')
      R(gx + 1, gy + 18, 22, 1, '#d4c4a0')
      // glass depth + glare
      R(gx, gy, 24, 1, 'rgba(60,80,120,0.25)')
      R(gx, gy, 1, 19, 'rgba(60,80,120,0.2)')
      R(gx + 2, gy + 2, 1, 3, 'rgba(255,255,255,0.8)')
      R(gx + 3, gy + 2, 1, 1, 'rgba(255,255,255,0.8)')
      // curtains gathered with tie-backs
      for (let j = 0; j < 23; j++) {
        const t = j < 12 ? 6 - Math.floor(j / 3) : Math.min(6, 2 + Math.floor((j - 12) / 2))
        const yy = y + 5 + j
        R(x + 1, yy, t, 1, '#f6d88a')
        R(x + t, yy, 1, 1, '#d4ac58')
        R(x + 2, yy, 1, 1, '#fff2c4')
        R(x + 31 - t, yy, t, 1, '#f6d88a')
        R(x + 31 - t, yy, 1, 1, '#d4ac58')
        R(x + 29, yy, 1, 1, '#fff2c4')
      }
      R(x + 1, y + 17, 4, 2, '#3f9490')
      R(x + 27, y + 17, 4, 2, '#3f9490')
      R(x + 1, y + 3, 30, 2, '#5a5878')
      oell(R, x + 1, y + 4, 2, 2, '#34324a', '#8a88a8')
      oell(R, x + 31, y + 4, 2, 2, '#34324a', '#8a88a8')
      box(R, x + 3, y + 27, 24, 2, 2, 2, PAINT)
    },
  },
  {
    id: 'poster', x: 6, y: 1, w: 1, h: 2, solid: true,
    text: ['A framed photo of you and Plum.', '(About me coming soon!)'],
    draw(R, x, y0) {
      const y = y0 - 6
      R(x + 7, y + 3, 2, 2, '#4c4658')
      R(x + 6, y + 5, 1, 2, '#4c4658')
      R(x + 9, y + 5, 1, 2, '#4c4658')
      R(x + 2, y + 9, 15, 17, 'rgba(40,30,60,0.15)')
      orr(R, x, y + 7, 16, 17, 3, '#2c4a50', '#3f9490')
      R(x + 2, y + 8, 12, 1, '#6cc4bc')
      rr(R, x + 2, y + 9, 12, 13, 2, '#ffe6a8')
      R(x + 3, y + 10, 1, 1, '#ffffff')
      R(x + 12, y + 12, 1, 1, '#ffffff')
      oell(R, x + 8, y + 17, 5, 5, '#22182e', '#8a5ad0')
      R(x + 8, y + 11, 1, 2, '#22182e')
      ell(R, x + 8, y + 19, 3, 2, '#fff4dc')
      R(x + 5, y + 15, 2, 2, '#22182e')
      R(x + 10, y + 15, 2, 2, '#22182e')
      R(x + 5, y + 15, 1, 1, '#ffffff')
      R(x + 10, y + 15, 1, 1, '#ffffff')
      R(x + 7, y + 17, 3, 1, '#f6a03a')
      R(x + 4, y + 17, 1, 1, '#f6a0b8')
      R(x + 12, y + 17, 1, 1, '#f6a0b8')
    },
  },
  {
    id: 'desk', x: 8, y: 2, w: 3, h: 2, solid: true,
    text: ["Andrew's PC. A resume is open on the screen.", '(Resume coming soon!)'],
    draw(R, x, y) {
      R(x + 3, y + 31, 44, 2, SHADOW)
      R(x + 46, y + 9, 2, 24, SHADOW)
      // desk: thick top slab + body
      const top = box(R, x, y + 1, 45, 10, 3, 3, PAINT)
      box(R, x + 1, y + 14, 43, 0, 16, 2, PAINT)
      R(top.fx, top.fy + 3, top.fw, 1, PAINT.sh)
      recess(R, x + 3, y + 16, 24, 13, PAINT)
      R(x + 4, y + 26, 22, 2, 'rgba(0,0,0,0.12)')
      for (const dy of [16, 23]) {
        box(R, x + 29, y + dy, 13, 0, 6, 1, { ...PAINT, front: '#f4efe4', sh: PAINT.front })
        oell(R, x + 35, y + dy + 3, 2, 2, '#2c4a50', '#6cc4bc')
      }
      // CRT computer with depth
      const mon = box(R, x + 5, y - 16, 20, 5, 17, 4, BEIGE)
      orr(R, mon.fx + 2, mon.fy + 2, 16, 12, 3, '#6a6474', '#8e8698')
      rr(R, mon.fx + 3, mon.fy + 3, 14, 10, 2, '#2e5a78')
      rr(R, mon.fx + 4, mon.fy + 4, 12, 8, 2, '#3c7090')
      R(mon.fx + 5, mon.fy + 5, 6, 1, '#c4ecfc')
      R(mon.fx + 5, mon.fy + 7, 8, 1, '#c4ecfc')
      R(mon.fx + 5, mon.fy + 9, 4, 1, '#8cc8e4')
      R(mon.fx + 14, mon.fy + 4, 1, 2, '#88bcdc')
      R(mon.fx + 3, mon.fy + 15, 3, 1, '#7ad87a')
      for (let k = 0; k < 3; k++) R(mon.fx + 21 + k, mon.fy + 4 - k, 1, 6, BEIGE.sh)
      // keyboard + mouse
      box(R, x + 7, y + 6, 18, 2, 2, 1, BEIGE)
      for (let i = 0; i < 8; i++) R(x + 8 + i * 2, y + 6, 1, 1, '#c8bc9e')
      oell(R, x + 29, y + 8, 2, 2, '#4a4650', '#faf4e4')
      // mug
      orr(R, x + 35, y + 2, 7, 9, 2, '#1c3a40', '#4fa8a2')
      ell(R, x + 38, y + 3, 2, 1, '#5a3420')
      R(x + 36, y + 5, 1, 4, '#86d8cc')
      R(x + 42, y + 5, 1, 1, '#1c3a40')
      R(x + 43, y + 6, 1, 2, '#1c3a40')
      R(x + 42, y + 8, 1, 1, '#1c3a40')
      R(x + 37, y - 1, 1, 2, 'rgba(255,255,255,0.6)')
      R(x + 39, y - 3, 1, 2, 'rgba(255,255,255,0.45)')
    },
  },
  {
    id: 'chair', x: 9, y: 4, w: 1, h: 1, solid: true,
    text: ['A spinny desk chair.', 'You give it a spin. Wheee!'],
    draw(R, x, y) {
      ell(R, x + 8, y + 14, 7, 2, SHADOW)
      R(x + 4, y + 12, 8, 1, '#3a3a46')
      R(x + 7, y + 8, 2, 5, '#5a5a66')
      ell(R, x + 3, y + 13, 1, 1, '#2a2a34')
      ell(R, x + 13, y + 13, 1, 1, '#2a2a34')
      ell(R, x + 8, y + 14, 1, 1, '#2a2a34')
      oell(R, x + 8, y + 7, 7, 3, TEAL.o, TEAL.front)
      R(x + 3, y + 6, 10, 1, TEAL.top)
      orr(R, x + 2, y - 9, 12, 15, 5, TEAL.o, TEAL.front)
      rr(R, x + 4, y - 7, 8, 11, 3, TEAL.sh)
      R(x + 5, y - 7, 3, 1, TEAL.hi)
      R(x + 4, y - 6, 1, 3, TEAL.hi)
    },
  },
  {
    id: 'plant', x: 11, y: 3, w: 1, h: 1, solid: true,
    text: ['A very well-watered tree.', 'It looks happy.'],
    draw(R, x, y) {
      ell(R, x + 8, y + 15, 7, 2, SHADOW)
      R(x + 7, y - 2, 2, 8, '#7a4a2a')
      R(x + 7, y - 2, 1, 8, '#9a6a3a')
      const blobs = [[8, -9, 7], [8, -16, 5], [4, -4, 4], [12, -4, 4], [8, -2, 5]]
      for (const [bx, by, r] of blobs) ell(R, x + bx, y + by, r + 1, r + 1, '#24502a')
      for (const [bx, by, r] of blobs) ell(R, x + bx, y + by, r, r, '#3e8a3c')
      for (const [bx, by, r] of blobs) ell(R, x + bx - 1, y + by - 1, r - 1, r - 1, '#5aaa4a')
      for (const [bx, by, r] of blobs) ell(R, x + bx - 2, y + by - 2, Math.max(1, r - 3), Math.max(1, r - 3), '#86cc66')
      R(x + 4, y - 15, 1, 1, '#b4e894')
      R(x + 2, y - 8, 1, 1, '#b4e894')
      // pot
      orr(R, x + 3, y + 5, 10, 11, 4, PAINT.o, PAINT.front)
      R(x + 4, y + 9, 8, 2, TEAL.front)
      R(x + 9, y + 7, 2, 7, PAINT.side)
      R(x + 5, y + 7, 1, 6, '#ffffff')
      orr(R, x + 2, y + 4, 12, 4, 2, PAINT.o, PAINT.top)
      R(x + 4, y + 5, 8, 1, '#5a3420')
    },
  },
  {
    id: 'tv', x: 1, y: 5, w: 2, h: 2, solid: true,
    text: ['A game console is hooked up to the TV.', '(Projects coming soon!)'],
    draw(R, x, y) {
      R(x + 3, y + 31, 28, 2, SHADOW)
      R(x + 30, y + 14, 2, 19, SHADOW)
      // low TV bench
      const st = box(R, x + 1, y + 11, 27, 5, 14, 3, TEAL)
      recess(R, st.fx + 2, st.fy + 3, 11, 9, TEAL)
      recess(R, st.fx + 14, st.fy + 3, 11, 9, TEAL)
      box(R, st.fx + 3, st.fy + 7, 8, 2, 3, 1, { o: '#3a3a4c', top: '#e8e8f2', hi: '#ffffff', front: '#c8c8d6', sh: '#b0b0c0', side: '#9a9aac' })
      ell(R, st.fx + 5, st.fy + 10, 1, 1, '#e05050')
      for (const [i, c] of [[0, '#6a94dc'], [3, '#f0c860'], [6, '#e07070']]) R(st.fx + 16 + i, st.fy + 6, 2, 6, c)
      R(st.fx + 16, st.fy + 6, 8, 1, 'rgba(255,255,255,0.3)')
      // CRT television
      R(x + 11, y - 9, 1, 6, '#3a3a46')
      R(x + 20, y - 9, 1, 6, '#3a3a46')
      ell(R, x + 10, y - 10, 1, 1, '#c0c0cc')
      ell(R, x + 21, y - 10, 1, 1, '#c0c0cc')
      R(x + 4, y + 15, 25, 2, 'rgba(0,0,0,0.25)')
      const tv = box(R, x + 4, y - 4, 20, 5, 15, 4, TVBOX)
      for (let k = 0; k < 3; k++) R(tv.fx + 21 + k, tv.fy + 5 - k, 1, 1, '#2a2a38')
      for (let k = 0; k < 3; k++) R(tv.fx + 21 + k, tv.fy + 8 - k, 1, 1, '#2a2a38')
      orr(R, tv.fx + 1, tv.fy + 1, 14, 12, 3, '#1a1a24', '#2a2a36')
      rr(R, tv.fx + 2, tv.fy + 2, 12, 10, 3, '#22344a')
      rr(R, tv.fx + 3, tv.fy + 3, 10, 8, 2, '#2c4460')
      R(tv.fx + 4, tv.fy + 4, 3, 1, '#7aa0c0')
      R(tv.fx + 4, tv.fy + 5, 1, 2, '#7aa0c0')
      oell(R, tv.fx + 17, tv.fy + 3, 2, 2, '#22222c', '#c8c8d6')
      oell(R, tv.fx + 17, tv.fy + 8, 2, 2, '#22222c', '#c8c8d6')
      R(tv.fx + 15, tv.fy + 11, 4, 1, '#2a2a38')
      // controller + cable
      R(x + 12, y + 30, 1, 3, '#3a3a46')
      R(x + 13, y + 33, 3, 1, '#3a3a46')
      orr(R, x + 15, y + 31, 9, 5, 2, '#3a3a46', '#a4a4b8')
      R(x + 17, y + 33, 1, 1, '#3a3a46')
      ell(R, x + 21, y + 33, 1, 1, '#e05050')
    },
  },
  {
    id: 'beanbag', x: 3, y: 7, w: 1, h: 1, solid: true,
    text: ['A squishy beanbag.', 'Perfect for long gaming sessions.'],
    draw(R, x, y) {
      ell(R, x + 8, y + 14, 8, 2, SHADOW)
      oell(R, x + 8, y + 9, 8, 6, '#7a4a10', '#eab040')
      ell(R, x + 9, y + 11, 6, 3, '#d0942a')
      oell(R, x + 8, y + 6, 6, 3, '#a8701c', '#dca034')
      ell(R, x + 8, y + 7, 4, 1, '#c88a24')
      ell(R, x + 4, y + 9, 2, 2, '#f8d478')
      R(x + 6, y + 4, 3, 1, '#f6cc6a')
    },
  },
  {
    id: 'bed', x: 10, y: 7, w: 2, h: 3, solid: true,
    text: [
      'She glances up from her phone.',
      '"Wait wait wait. You HAVE to see this reel."',
      '(She turns the screen toward you, already laughing.)',
    ],
    hugText: ['Plum is squeezing her in a big hug.', '"Awww, PLUM! Okay okay, the reel can wait."'],
    draw(R, x, y) {
      R(x + 2, y + 46, 29, 2, SHADOW)
      R(x + 4, y + 48, 25, 1, 'rgba(40,30,60,0.1)')
      // arched headboard with round posts
      oell(R, x + 16, y + 2, 15, 10, WOOD.o, WOOD.front)
      ell(R, x + 16, y + 2, 12, 7, WOOD.lite)
      ell(R, x + 16, y + 3, 12, 7, WOOD.front)
      R(x + 2, y + 2, 28, 6, WOOD.front)
      for (const px of [x, x + 27]) {
        orr(R, px, y - 4, 5, 16, 2, WOOD.o, WOOD.front)
        R(px + 1, y - 3, 1, 14, WOOD.lite)
        R(px + 3, y - 3, 1, 14, WOOD.sh)
        oell(R, px + 2, y - 5, 3, 3, WOOD.o, WOOD.hi)
        R(px + 1, y - 6, 1, 1, '#f8d4a4')
      }
      // footboard rail + legs
      R(x + 2, y + 44, 3, 3, WOOD.o)
      R(x + 27, y + 44, 3, 3, WOOD.o)
      R(x + 3, y + 44, 1, 2, WOOD.sh)
      R(x + 28, y + 44, 1, 2, WOOD.sh)
      orr(R, x + 1, y + 37, 30, 8, 2, WOOD.o, WOOD.front)
      R(x + 3, y + 38, 26, 1, WOOD.hi)
      R(x + 2, y + 42, 28, 2, WOOD.sh)
      // mattress
      orr(R, x + 2, y + 5, 28, 34, 4, SHEET.o, SHEET.top)
      R(x + 4, y + 6, 24, 1, '#ffffff')
      // pillow
      orr(R, x + 5, y + 7, 22, 12, 5, '#b4acc4', '#ffffff')
      rr(R, x + 6, y + 13, 20, 5, 3, '#e8e4f0')
      R(x + 16, y + 9, 1, 5, '#e8e4f0')
      ell(R, x + 10, y + 10, 2, 1, '#ffffff')
      // her hair fanned out on the pillow, then her face
      oell(R, x + 16, y + 11, 10, 6, GIRL_PAL.o, GIRL_PAL.h)
      for (const [cx, cy] of [[8, 9], [10, 14], [22, 9], [23, 13], [9, 12], [21, 15]]) {
        oell(R, x + cx, y + cy, 2, 2, GIRL_PAL.o, GIRL_PAL.h)
        R(x + cx - 1, y + cy - 1, 1, 1, GIRL_PAL.H)
      }
      pix(R, x + 8, y + 5, GIRL_HEAD, GIRL_PAL)
      if (roomState.hugging) {
        // happy closed eyes + big smile
        R(x + 12, y + 11, 2, 1, GIRL_PAL.s)
        R(x + 18, y + 11, 2, 1, GIRL_PAL.s)
        R(x + 12, y + 10, 2, 1, GIRL_PAL.e)
        R(x + 18, y + 10, 2, 1, GIRL_PAL.e)
        R(x + 14, y + 13, 4, 1, GIRL_PAL.m)
        R(x + 15, y + 14, 2, 1, '#e88a8a')
      }
      // quilt: front drape first, then the top surface over it
      orr(R, x + 2, y + 33, 28, 9, 3, '#34508c', '#5f84c4')
      for (let i = 0; i < 6; i++) ell(R, x + 5 + i * 4.4, y + 41, 2, 1, '#5f84c4')
      R(x + 4, y + 39, 24, 1, '#5274b4')
      orr(R, x + 2, y + 19, 28, 17, 3, '#34508c', '#7aa2dc')
      rr(R, x + 3, y + 20, 26, 6, 2, '#d8e6f8')
      R(x + 4, y + 25, 24, 1, '#a4c0e8')
      R(x + 3, y + 27, 1, 7, '#9cbcec')
      R(x + 28, y + 27, 1, 7, '#5f84c4')
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 4; i++) {
          const px = x + 7 + i * 6 + (j % 2 ? 3 : 0)
          if (px > x + 26) continue
          ell(R, px, y + 29 + j * 4, 2, 1, '#a4c4ee')
          R(px - 1, y + 28 + j * 4, 1, 1, '#d8e6f8')
        }
      }
      // arms + phone resting above the quilt, screen glow spilling on the fold
      pix(R, x + 8, y + 15, GIRL_ARMS, GIRL_PAL)
      R(x + 14, y + 15, 4, 1, '#bfe8ff')
    },
  },
]

export function objectAt(tx, ty) {
  let found = null // last match wins so furniture beats the rug
  for (const o of objects) {
    if (tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h) found = o
  }
  return found
}

export function isBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || ty < WALL_ROWS) return true
  return Boolean(objectAt(tx, ty)?.solid)
}

export function drawObject(ctx, o) {
  o.draw(painter(ctx), o.x * TILE, o.y * TILE)
}

// Static layer: void, walls, floor, flat decals. Furniture is drawn per-frame for depth sorting.
export function drawRoom(ctx) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  const R = painter(ctx)

  // pale oak floor boards
  for (let py = WALL_H; py < H; py++) {
    const board = Math.floor((py - WALL_H) / 8)
    const row = (py - WALL_H) % 8
    const jointOff = Math.floor(hash(board, 7) * 40)
    for (let px = 0; px < W; px++) {
      let c = '#e4c8a0'
      const n = hash(px, py)
      if (n < 0.05) c = '#d8ba90'
      else if (n > 0.96) c = '#eed6b4'
      if (row === 0) c = '#f0dabb'
      if (row === 7) c = '#c8a87c'
      if ((px + jointOff) % 48 === 0 && row !== 0) c = '#c8a87c'
      if ((px + jointOff) % 48 === 1 && row !== 0 && row !== 7) c = '#eed6b4'
      R(px, py, 1, 1, c)
    }
  }

  // sunlight from the window
  for (let i = 0; i < 44; i++) R(50 + Math.floor(i * 0.5), WALL_H + i, 28, 1, 'rgba(255,250,225,0.18)')

  // periwinkle wall with pinstripes
  R(0, 0, W, WALL_H, '#ccd4ee')
  for (let wx = 2; wx < W; wx += 8) {
    R(wx, 7, 1, WALL_H - 19, '#bec8e6')
    R(wx + 2, 7, 1, WALL_H - 19, '#d6ddf2')
  }
  // crown molding
  R(0, 0, W, 2, '#4a4a68')
  R(0, 2, W, 3, '#fbfaf6')
  R(0, 5, W, 1, '#a8b0d0')
  R(0, 6, W, 2, 'rgba(40,40,80,0.06)')
  // white wainscoting
  const ws = WALL_H - 12
  R(0, ws, W, 12, '#f4f4f8')
  R(0, ws, W, 1, '#ffffff')
  R(0, ws + 1, W, 1, '#c8cce0')
  for (let px = 4; px < W; px += 24) {
    R(px, ws + 3, 20, 1, '#dadcea')
    R(px, ws + 3, 1, 5, '#dadcea')
    R(px + 1, ws + 8, 19, 1, '#ffffff')
    R(px + 20, ws + 3, 1, 6, '#ffffff')
  }
  R(0, WALL_H - 3, W, 2, '#ffffff')
  R(0, WALL_H - 1, W, 1, '#9aa0bc')
  R(0, WALL_H, W, 2, 'rgba(40,30,60,0.14)')

  R(0, WALL_H, 2, H - WALL_H, 'rgba(0,0,0,0.1)')
  R(W - 2, WALL_H, 2, H - WALL_H, 'rgba(0,0,0,0.1)')

  for (const o of objects) if (o.flat) drawObject(ctx, o)
}
