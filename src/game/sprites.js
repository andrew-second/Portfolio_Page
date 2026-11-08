export const SPRITE_W = 16
export const SPRITE_H = 24

export const PALETTE = {
  o: '#1a141e', // outline
  // cap
  B: '#e03c40',
  b: '#ff7c68',
  N: '#9c2434',
  K: '#24222c', // brim
  k: '#45434f', // brim highlight
  W: '#ffc23a', // bolt emblem
  // hair
  h: '#2c2836',
  H: '#56507a',
  d: '#16131c',
  // face
  s: '#fcd8b4',
  S: '#e6a880',
  r: '#f6a090',
  m: '#a8504a',
  e: '#1a141e',
  i: '#2a3c80',
  w: '#ffffff',
  // jacket
  J: '#3a3c4e',
  j: '#5e6280',
  Q: '#24252f',
  T: '#f4f0e8',
  t: '#c8c0b4',
  z: '#e03c40',
  R: '#e03c40',
  // backpack
  y: '#f2c044',
  Y: '#c88c24',
  // jeans + sneakers
  p: '#4a66a4',
  P: '#34487a',
  g: '#f4f4f8',
  G: '#a8aec0',
}

// '|' separators are only there to make the 16 columns easy to count.
const CAP_FRONT = [
  '....|oooo|oooo|....',
  '..oo|bbbB|BBBB|oo..',
  '.obb|BBBB|WWBB|BNo.',
  '.obB|BBBW|WBBB|NNo.',
  'oNBB|BBWW|BBBB|NNNo',
  'okkk|kkkk|kkkk|kkKo',
  '.oKK|KKKK|KKKK|KKo.',
]
const FACE_DOWN = [
  '.ohd|SSSS|SSSS|dho.',
  '.ohs|eess|ssee|sho.',
  'ohhs|iwss|ssiw|shho',
  'ohds|iiss|ssii|sdho',
  '..os|rsss|mmss|ro..',
  '...o|Ssss|sssS|o...',
]
const BODY_FRONT = [
  '..oj|JJJT|TJJJ|Jo..',
  '.ojJ|JJJt|tJJJ|JQo.',
  '.ojR|JJJz|zJJJ|RQo.',
  '.osj|JJJz|zJJJ|Qso.',
  '.oSQ|JJJJ|JJJJ|QSo.',
  '..oQ|QQQQ|QQQQ|Qo..',
]

const CAP_BACK = [
  '....|oooo|oooo|....',
  '..oo|bbbB|BBBB|oo..',
  '.obb|BBBB|BBBB|BNo.',
  '.obB|BBBB|BBBB|NNo.',
  'oNBB|BBBB|BBBB|NNNo',
  'oNNN|NNBo|oBNN|NNNo',
  'ohHh|NNNo|oNNN|hHho',
]
const HEAD_BACK = [
  '.ohH|hhhh|hhhh|hho.',
  'ohhh|hHhh|hhhh|hdho',
  '.ohh|hhhh|hhhh|hdo.',
  'ohdh|hhdh|hdhh|hddo',
  '..od|hdhd|dhdh|do..',
  '...o|Sddd|dddS|o...',
]
const BODY_BACK = [
  '..oj|Jooo|oooJ|Jo..',
  '.ojJ|oyyy|yyyo|JQo.',
  '.ojR|oyYY|YYyo|RQo.',
  '.osj|oyyy|yyyo|Qso.',
  '.oSQ|oYYY|YYYo|QSo.',
  '..oQ|Qooo|oooQ|Qo..',
]

const LEGS_FRONT = {
  stand: [
    '...o|ppPo|oPpp|o...',
    '...o|ppPo|oPpp|o...',
    '...o|gggo|oggg|o...',
    '...o|GRGo|oGRG|o...',
    '....|ooo.|.ooo|....',
  ],
  walkA: [
    '...o|ppPo|oPpp|o...',
    '...o|gggo|oPpp|o...',
    '...o|GRGo|oggg|o...',
    '....|ooo.|oGRG|o...',
    '....|....|.ooo|....',
  ],
  walkB: [
    '...o|ppPo|oPpp|o...',
    '...o|ppPo|oggg|o...',
    '...o|gggo|oGRG|o...',
    '...o|GRGo|.ooo|....',
    '....|ooo.|....|....',
  ],
}

const HEAD_SIDE = [
  '....|oooo|oo..|....',
  '..oo|bbbB|BBoo|....',
  '.obb|BBBB|BBBB|o...',
  '.obB|BBBB|BBWW|No..',
  'oNBB|BBBB|BWWB|NNo.',
  'oNNN|NNNk|kkkk|kkko',
  'ohhh|hhhK|KKKK|KKo.',
  '.ohh|hhhS|SSSS|so..',
  'ohhh|hhss|ssee|so..',
  '.ohH|hhss|ssiw|so..',
  'ohdh|hsss|ssii|sso.',
  '.odd|hSss|sssr|mo..',
  '..od|dSSs|sssS|o...',
]
const BODY_SIDE = [
  '..oy|oJjj|jJJo|....',
  '.oyy|oJjj|JJJo|....',
  '.oyY|oJRR|JJQo|....',
  '.oyY|oJJs|sJQo|....',
  '.oYY|oQQS|SQQo|....',
  '..oo|oQQQ|QQQo|....',
]
const LEGS_SIDE = {
  stand: [
    '....|oppP|Ppo.|....',
    '....|oppP|Ppo.|....',
    '....|oggg|gggo|....',
    '....|oGGR|RGGo|....',
    '....|.ooo|ooo.|....',
  ],
  walkA: [
    '...o|ppPo|oPpp|o...',
    '..op|pPo.|.oPp|po..',
    '..og|ggo.|.ogg|ggo.',
    '..oG|GRo.|.oGR|GGo.',
    '...o|oo..|..oo|oo..',
  ],
}
LEGS_SIDE.walkB = LEGS_SIDE.stand

export function spriteRows(dir, frame) {
  let rows
  if (dir === 'down') rows = [...CAP_FRONT, ...FACE_DOWN, ...BODY_FRONT, ...LEGS_FRONT[frame]]
  else if (dir === 'up') rows = [...CAP_BACK, ...HEAD_BACK, ...BODY_BACK, ...LEGS_FRONT[frame]]
  else rows = [...HEAD_SIDE, ...BODY_SIDE, ...LEGS_SIDE[frame]]
  rows = rows.map((r) => r.replaceAll('|', ''))
  if (dir === 'left') rows = rows.map((r) => [...r].reverse().join(''))
  return rows
}

const cache = new Map()

function build(dir, frame) {
  const c = document.createElement('canvas')
  c.width = SPRITE_W
  c.height = SPRITE_H
  const ctx = c.getContext('2d')
  spriteRows(dir, frame).forEach((row, y) => {
    for (let x = 0; x < SPRITE_W; x++) {
      const color = PALETTE[row[x]]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }
    }
  })
  return c
}

// x/y = top-left of the tile the player stands on (canvas space)
export function drawPlayer(ctx, x, y, dir, frame) {
  const key = `${dir}-${frame}`
  if (!cache.has(key)) cache.set(key, build(dir, frame))
  ctx.fillStyle = 'rgba(40,20,10,0.25)'
  ctx.fillRect(x + 4, y + 12, 8, 5)
  ctx.fillRect(x + 3, y + 13, 1, 3)
  ctx.fillRect(x + 12, y + 13, 1, 3)
  const bob = frame === 'stand' ? 0 : 1
  ctx.drawImage(cache.get(key), x, y + 16 - SPRITE_H - bob)
}

// ---------- Plum: the purple penguin-chick buddy that follows you ----------
export const BUDDY_PALETTE = {
  o: '#22182e',
  U: '#8a5ad0', // body
  u: '#b48eec', // body light
  V: '#5e3a9a', // body shade
  c: '#fff4dc', // belly
  C: '#e6d2b0',
  e: '#22182e',
  w: '#ffffff',
  n: '#f6a03a', // beak + feet
  N: '#c8701c',
  r: '#f6a0b8', // blush
  s: '#3fb4ac', // scarf
  S: '#2a7a76',
}

const BUDDY = {
  down: [
    '....|....|o...|....',
    '....|...o|uo..|....',
    '....|.ooo|Uooo|....',
    '...o|uuUU|UUUU|o...',
    '..ou|uUUU|UUUU|Vo..',
    '..ou|UUUU|UUUU|Vo..',
    '.ouU|weUU|UUwe|UVo.',
    '.ouU|eeUn|nUee|UVo.',
    '.oUU|rUUN|NUUr|UVo.',
    '.osS|ssss|ssss|sSo.',
    '.oUU|sScc|cccU|UVo.',
    'oUUU|sccc|cccc|UVVo',
    'oVUU|cccc|cccc|UVVo',
    '.oVU|Cccc|cccC|VVo.',
    '..oV|VCCC|CCCV|Vo..',
    '...o|nno.|.nno|....',
  ],
  up: [
    '....|....|o...|....',
    '....|...o|uo..|....',
    '....|.ooo|Uooo|....',
    '...o|uuUU|UUUU|o...',
    '..ou|uUUU|UUUU|Vo..',
    '..ou|UUUU|UUUU|Vo..',
    '.ouU|UUUU|UUUU|UVo.',
    '.ouU|UUUU|UUUU|UVo.',
    '.oUU|UUUU|UUUU|UVo.',
    '.osS|ssss|ssss|sSo.',
    '.oUU|UUUs|SUUU|UVo.',
    'oUUU|UUUs|SUUU|UVVo',
    'oVUU|UUUU|UUUU|UVVo',
    '.oVU|UUUU|UUUU|VVo.',
    '..oV|VVVo|oVVV|Vo..',
    '...o|nno.|.nno|....',
  ],
  right: [
    '....|....|o...|....',
    '....|...o|uo..|....',
    '....|.ooo|Uoo.|....',
    '...o|uuUU|UUUo|....',
    '..ou|UUUU|UUUU|o...',
    '..ou|UUUU|UUwe|o...',
    '..oU|UUUU|UUee|nno.',
    '..oU|UUUU|UUUr|NNo.',
    '..oU|UUUU|UUUU|oo..',
    '..os|ssss|ssss|So..',
    '.oSs|UUUU|UUcc|o...',
    '.oSo|UVVU|Uccc|o...',
    '..oV|UVVU|Uccc|o...',
    '..oV|VUUU|UccC|o...',
    '...o|VVVV|VCCo|....',
    '....|onno|nno.|....',
  ],
}

// waddle frame: lift one foot
const BUDDY_FEET_ALT = { down: '...o|nno.|..oo|....', up: '...o|nno.|..oo|....', right: '....|.ooo|nno.|....' }

function buddyRows(dir, step) {
  const base = dir === 'left' ? 'right' : dir
  let rows = BUDDY[base].slice()
  if (step) rows[15] = BUDDY_FEET_ALT[base]
  rows = rows.map((r) => r.replaceAll('|', ''))
  if (dir === 'left') rows = rows.map((r) => [...r].reverse().join(''))
  return rows
}

export function buddySpriteRows(dir, step) {
  return buddyRows(dir, step)
}

function buildFrom(rows, palette, w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = palette[row[x]]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }
    }
  })
  return c
}

// x/y = top-left of the 16x16 footprint (canvas space); step = 0|1 waddle frame
export function drawBuddy(ctx, x, y, dir, step) {
  const key = `buddy-${dir}-${step}`
  if (!cache.has(key)) cache.set(key, buildFrom(buddyRows(dir, step), BUDDY_PALETTE, 16, 16))
  ctx.fillStyle = 'rgba(40,20,10,0.22)'
  ctx.fillRect(x + 4, y + 13, 8, 3)
  ctx.fillRect(x + 3, y + 14, 1, 1)
  ctx.fillRect(x + 12, y + 14, 1, 1)
  ctx.drawImage(cache.get(key), x, y + 1 - step)
}
