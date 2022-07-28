import Swal from 'sweetalert2/dist/sweetalert2.js'

export const SwalMUI = Swal.mixin({
  customClass: {
    header: 'error-bg',
    confirmButton: 'mui-btn mui-btn--primary lr-padding',
    cancelButton: 'mui-btn lr-padding'
  },
  buttonsStyling: false
})

SwalMUI.select = ({ title, inputOptions }) => {
  const dialog = SwalMUI.fire({
    title,
    input: 'select',
    inputOptions
  })

  const element = document.querySelector('.swal2-select')
  const parent = element.parentNode
  const wrapper = document.createElement('div')
  wrapper.classList.add('mui-select')
  wrapper.style.paddingRight = '64px'
  parent.replaceChild(wrapper, element)
  wrapper.appendChild(element)

  return dialog
}

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})
