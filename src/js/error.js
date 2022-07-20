export class AlertError extends Error {
  constructor (title = undefined, message = undefined) {
    super(message)
    this.title = title
  }
}

export class MismatchError extends Error {}
