import Swal from 'sweetalert2/dist/sweetalert2.js'

export const SwalMUI = Swal.mixin({
  customClass: {
    header: 'error-bg',
    confirmButton: 'mui-btn mui-btn--primary lr-padding',
    cancelButton: 'mui-btn lr-padding'
  },
  buttonsStyling: false
})
