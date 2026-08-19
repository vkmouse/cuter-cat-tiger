import type { Preview } from '@storybook/vue3-vite'

import '../../cuter-cat-tiger/src/styles/variables.css'
import '../../cuter-cat-tiger/src/styles/base.css'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
