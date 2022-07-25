export function cuteDialog ({
  title,
  bodyTemplate,
  closeStyle
}) {
  return new Promise((resolve) => {
    setInterval(() => {}, 5000)
    const body = document.querySelector('body')

    let closeStyleTemplate = 'alert-close'
    if (closeStyle === 'circle') {
      closeStyleTemplate = 'alert-close-circle'
    }

    const template = `
<div class="alert-wrapper">
  <div class="dialog-frame">
    <div class="dialog-header question-bg">
      <div class="dialog-title">
        <span>${title}</span>
      </div>
      <span class="${closeStyleTemplate}">X</span>
    </div>
    <div class="alert-body">
      ${bodyTemplate}
    </div>
  </div>
</div>
`

    body.insertAdjacentHTML('afterend', template)

    const alertWrapper = document.querySelector('.alert-wrapper')
    const alertFrame = document.querySelector('.dialog-frame')
    const alertClose = document.querySelector(`.${closeStyleTemplate}`)

    function resolveIt () {
      alertWrapper.remove()
      resolve()
    }
    function resolveButton (id) {
      alertWrapper.remove()
      resolve(id)
    }
    function stopProp (e) {
      e.stopPropagation()
    }

    alertClose.addEventListener('click', resolveIt)
    alertWrapper.addEventListener('click', resolveIt)
    alertFrame.addEventListener('click', stopProp)

    document.querySelectorAll('.device-button')
      .forEach(b => b.addEventListener('click', _ => { resolveButton(b.id) }))
  })
}
