import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import {createApp} from 'vue'
import App from './App.vue'
import {createVuetify} from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import * as vertical from 'vuetify/labs/VStepperVertical'
import { VNumberInput } from 'vuetify/labs/VNumberInput'

const vuetify = createVuetify({
    components: {...components, ...vertical, VNumberInput},
    directives: directives,
    theme: {
        defaultTheme: 'light'
    },
    defaults: {
        global: {
            density: "compact",
        },
        VBtn: {
            density: "default"
        }
    }
})

createApp(App)
    .use(vuetify)
    .mount('#app')
