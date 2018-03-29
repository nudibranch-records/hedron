import scenesListener from './scenes/listener'
import sketchesListener from './sketches/listener'

export default {
  types: 'all',

  handleAction (action, dispatched, store) {
    scenesListener(action, store)
    sketchesListener(action, store)
  }
}