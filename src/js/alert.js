// Alert box design by Igor Ferrão de Souza: https://www.linkedin.com/in/igor-ferr%C3%A3o-de-souza-4122407b/

export function cuteAlert ({
  type,
  title,
  message,
  buttonText = 'OK',
  confirmText = 'OK',
  cancelText = 'Cancel',
  closeStyle
}) {
  return new Promise((resolve) => {
    setInterval(() => {}, 5000)
    const body = document.querySelector('body')

    let closeStyleTemplate = 'alert-close'
    if (closeStyle === 'circle') {
      closeStyleTemplate = 'alert-close-circle'
    }

    let btnTemplate = `<button class="alert-button ${type}-bg ${type}-btn mui-btn mui-btn--primary">${buttonText}</button>`
    if (type === 'question') {
      btnTemplate = `
<div class="question-buttons">
  <button class="confirm-button error-bg error-btn mui-btn mui-btn--danger">${confirmText}</button>
  <button class="cancel-button question-bg question-btn mui-btn">${cancelText}</button>
</div>
`
    }

    let svgTemplate = `
<svg class="alert-img" xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 52 52" xmlns:v="https://vecta.io/nano">
<path d="M26 0C11.664 0 0 11.663 0 26s11.664 26 26 26 26-11.663 26-26S40.336 0 26 0zm0 50C12.767 50 2 39.233 2 26S12.767 2 26 2s24 10.767 24 24-10.767 24-24
24zm9.707-33.707a1 1 0 0 0-1.414 0L26 24.586l-8.293-8.293a1 1 0 0 0-1.414 1.414L24.586 26l-8.293 8.293a1 1 0 0 0 0 1.414c.195.195.451.293.707.293s.512-.098.707
-.293L26 27.414l8.293 8.293c.195.195.451.293.707.293s.512-.098.707-.293a1 1 0 0 0 0-1.414L27.414 26l8.293-8.293a1 1 0 0 0 0-1.414z"/>
</svg>
`
    if (type === 'success') {
      svgTemplate = `
<svg class="alert-img" xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 52 52" xmlns:v="https://vecta.io/nano">
<path d="M26 0C11.664 0 0 11.663 0 26s11.664 26 26 26 26-11.663 26-26S40.336 0 26 0zm0 50C12.767 50 2 39.233 2 26S12.767 2 26 2s24 10.767 24 24-10.767 24-24
24zm12.252-34.664l-15.369 17.29-9.259-7.407a1 1 0 0 0-1.249 1.562l10 8a1 1 0 0 0 1.373-.117l16-18a1 1 0 1 0-1.496-1.328z"/>
</svg>
`
    }
    if (type === 'info') {
      svgTemplate = `
<svg class="alert-img" xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 64 64" xmlns:v="https://vecta.io/nano">
<path d="M38.535 47.606h-4.08V28.447a1 1 0 0 0-1-1h-4.52a1 1 0 1 0 0 2h3.52v18.159h-5.122a1 1 0 1 0 0 2h11.202a1 1 0 1 0 0-2z"/>
<circle cx="32" cy="18" r="3"/><path d="M32 0C14.327 0 0 14.327 0 32s14.327 32 32 32 32-14.327 32-32S49.673 0 32 0zm0 62C15.458 62 2 48.542 2 32S15.458 2 32 2s30 13.458 30 30-13.458 30-30 30z"/>
</svg>
`
    }

    const template = `
<div class="alert-wrapper">
  <div class="alert-frame">
    <div class="alert-header ${type}-bg">
      <span class="${closeStyleTemplate}">X</span>
      ${svgTemplate}
    </div>
    <div class="alert-body">
      <span class="alert-title">${title}</span>
      <span class="alert-message">${message}</span>
      ${btnTemplate}
    </div>
  </div>
</div>
`

    body.insertAdjacentHTML('afterend', template)

    const alertWrapper = document.querySelector('.alert-wrapper')
    const alertFrame = document.querySelector('.alert-frame')
    const alertClose = document.querySelector(`.${closeStyleTemplate}`)

    function resolveIt () {
      alertWrapper.remove()
      resolve()
    }
    function confirmIt () {
      alertWrapper.remove()
      resolve('confirm')
    }
    function stopProp (e) {
      e.stopPropagation()
    }

    if (type === 'question') {
      const confirmButton = document.querySelector('.confirm-button')
      const cancelButton = document.querySelector('.cancel-button')

      confirmButton.addEventListener('click', confirmIt)
      cancelButton.addEventListener('click', resolveIt)
    } else {
      const alertButton = document.querySelector('.alert-button')

      alertButton.addEventListener('click', resolveIt)
    }

    alertClose.addEventListener('click', resolveIt)
    alertWrapper.addEventListener('click', resolveIt)
    alertFrame.addEventListener('click', stopProp)
  })
}
