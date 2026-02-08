import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import {createApp} from 'vue'
import {createVuetify} from 'vuetify'
import * as vertical from 'vuetify/labs/VStepperVertical'

import './main.css'
import App from './App.vue'

const vuetify = createVuetify({
    components: {...vertical},
    theme: {
        defaultTheme: 'titanDark',
        themes: {
            titanDark: {
                dark: true,
                colors: {
                    background: '#0A0A0A',
                    surface: '#1A1A1A',
                    primary: '#FA8423',
                    secondary: '#B8860B',
                    info: '#9CA3AF',
                    success: '#FA8423',
                    warning: '#B8860B',
                    error: '#FA8423'
                }
            }
        }
    },
    defaults: {
        global: {
            density: "compact",
        },
        VBtn: {
            density: "default",
            color: "primary"
        }
    }
})

createApp(App)
    .use(vuetify)
    .mount('#app')
