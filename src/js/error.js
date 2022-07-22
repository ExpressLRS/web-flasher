export class AlertError extends Error {
  constructor (title = undefined, message = undefined, type = 'error') {
    super(message)
    this.title = title
    this.type = type
  }
}

export class MismatchError extends Error {}
