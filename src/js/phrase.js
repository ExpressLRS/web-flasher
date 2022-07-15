const md5 = (function () {
  const k = []
  let i = 0

  for (; i < 64;) {
    k[i] = 0 | (Math.abs(Math.sin(++i)) * 4294967296)
  }

  function calcMD5 (str) {
    let b; let c; let d; let j
    const x = []
    const str2 = unescape(encodeURI(str))
    let a = str2.length
    const h = [b = 1732584193, c = -271733879, ~b, ~c]
    let i = 0

    for (; i <= a;) x[i >> 2] |= (str2.charCodeAt(i) || 128) << 8 * (i++ % 4)

    x[str = (a + 8 >> 6) * 16 + 14] = a * 8
    i = 0

    for (; i < str; i += 16) {
      a = h; j = 0
      for (; j < 64;) {
        a = [
          d = a[3],
          ((b = a[1] | 0) +
                        ((d = (
                          (a[0] +
                                [
                                  b & (c = a[2]) | ~b & d,
                                  d & b | ~d & c,
                                  b ^ c ^ d,
                                  c ^ (b | ~d)
                                ][a = j >> 4]
                          ) +
                            (k[j] +
                                (x[[
                                  j,
                                  5 * j + 1,
                                  3 * j + 5,
                                  7 * j
                                ][a] % 16 + i] | 0)
                            )
                        )) << (a = [
                          7, 12, 17, 22,
                          5, 9, 14, 20,
                          4, 11, 16, 23,
                          6, 10, 15, 21
                        ][4 * a + j++ % 4]) | d >>> 32 - a)
          ),
          b,
          c
        ]
      }
      for (j = 4; j;) h[--j] = h[j] + a[j]
    }

    str = []
    for (; j < 32;) str.push(((h[j >> 3] >> ((1 ^ j++ & 7) * 4)) & 15) * 16 + ((h[j >> 3] >> ((1 ^ j++ & 7) * 4)) & 15))

    return new Uint8Array(str)
  }
  return calcMD5
}())

function uidBytesFromText (text) {
  const bindingPhraseFull = `-DMY_BINDING_PHRASE="${text}"`
  const bindingPhraseHashed = md5(bindingPhraseFull)
  const uidBytes = bindingPhraseHashed.subarray(0, 6)

  return uidBytes
}

function initBindingPhraseGen () {
  const uid = document.getElementById('uid')

  function setOutput (text) {
    if (text === '') {
      uid.value = ''
    } else {
      const uidBytes = uidBytesFromText(text)
      uid.value = uidBytes
    }
  }

  function updateValue (e) {
    setOutput(e.target.value)
  }

  document.getElementById('phrase').addEventListener('input', updateValue)
  setOutput('')
}

export { initBindingPhraseGen }
