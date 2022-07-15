import Rtttl from 'bluejay-rtttl-parse'

export class MelodyParser {
  static #NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

  static #getFrequency (note, transposeBy = 0, A4 = 440) {
    // example note: A#5, meaning: 5th octave A sharp
    const octave = note.length === 3 ? Number(note[2]) : Number(note[1])
    let keyNumber = this.#NOTES.indexOf(note.slice(0, -1))
    if (keyNumber < 3) {
      keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1
    } else {
      keyNumber = keyNumber + ((octave - 1) * 12) + 1
    }
    keyNumber += transposeBy
    return Math.floor(A4 * 2 ** ((keyNumber - 49) / 12.0))
  }

  static #getDurationInMs (bpm, duration) {
    return Math.floor((1000 * (60 * 4 / bpm)) / duration)
  }

  static #parseMelody (melodyString, bpm = 120, transposeBySemitones = 0) {
    // parse string to python list
    const tokenizedNotes = melodyString.split(' ')
    const operations = []
    for (let i = 0; i < tokenizedNotes.length; i++) {
      const token = tokenizedNotes[i]
      const nextToken = tokenizedNotes[i + 1]
      console.log(token, nextToken)
      if (token[0] === 'P') {
        // Token is a pause operation, use frequency 0
        operations.push([0, this.#getDurationInMs(bpm, token.substring(1))])
      } else if ('ABCDEFG'.indexOf(token[0]) !== -1) {
        // Token is a note; next token will be duration of this note
        const frequency = this.#getFrequency(token, transposeBySemitones)
        const duration = this.#getDurationInMs(bpm, nextToken)
        operations.push([frequency, duration])
      }
    }
    return operations
  }

  static parseToArray (melodyOrRTTTL) {
    if (melodyOrRTTTL.indexOf('|') !== -1) {
      const defineValue = melodyOrRTTTL.split('|')
      const transposeBySemitones = defineValue.length > 2 ? Number(defineValue[2]) : 0
      return this.#parseMelody(defineValue[0].trim(), Number(defineValue[1]), transposeBySemitones)
    } else {
      const melody = Rtttl.parse(melodyOrRTTTL).melody.map((v) => [Math.floor(v.frequency), Math.floor(v.duration)])
      if (melody.length > 32) melody.length = 32
      return melody
    }
  }
}
