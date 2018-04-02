import uid from 'uid'
import { rSceneCreate, rSceneDelete, rSceneSelectCurrent,
  rSceneSelectChannel } from './actions'
import { generateSceneLinkableActionIds } from './utils'
import { engineSceneAdd, engineSceneRemove } from '../../engine/actions'
import { linkableActionCreate, linkableActionDelete } from '../linkableActions/actions'
import { uSketchDelete } from '../sketches/actions'
import { uiEditingOpen } from '../ui/actions'
import getScene from '../../selectors/getScene'
import getScenes from '../../selectors/getScenes'
import getSceneCrossfaderValue from '../../selectors/getSceneCrossfaderValue'
import history from '../../history'

const handleSceneCreate = (action, store) => {
  const id = uid()

  const la = generateSceneLinkableActionIds(id)

  const linkableActionIds = {}

  for (const key in la) {
    store.dispatch(linkableActionCreate(la[key].id, la[key].action))
    linkableActionIds[key] = la[key].id
  }

  const scene = {
    id,
    title: 'New Scene',
    selectedSketchId: false,
    sketchIds: [],
    linkableActionIds
  }

  store.dispatch(rSceneCreate(id, scene))
  store.dispatch(engineSceneAdd(id))

  store.dispatch(rSceneSelectCurrent(id))
  history.push(`/scenes/view`)

  store.dispatch(uiEditingOpen('sceneTitle', id))
}

const handleSceneDelete = (action, store) => {
  const p = action.payload
  let state = store.getState()
  const scene = getScene(state, p.id)

  scene.sketchIds.forEach(sketchId => {
    store.dispatch(uSketchDelete(sketchId, p.id))
  })

  for (const key in scene.linkableActionIds) {
    const id = scene.linkableActionIds[key]
    store.dispatch(linkableActionDelete(id))
  }

  store.dispatch(rSceneDelete(p.id))
  store.dispatch(engineSceneRemove(p.id))
  state = store.getState()
  const scenes = getScenes(state)
  const lastScene = scenes[scenes.length - 1]
  let url = lastScene ? `/scenes/view` : '/'

  store.dispatch(rSceneSelectCurrent(lastScene ? lastScene.id : false))
  history.push(url)
}

const handleSceneSketchSelect = (action, store) => {
  history.push(`/scenes/view`)
}

const handleSceneSelectChannel = (action, store) => {
  const state = store.getState()
  const p = action.payload
  const crossfaderValue = getSceneCrossfaderValue(state)

  let channel
  if (p.type === 'active') {
    channel = crossfaderValue < 0.5 ? 'A' : 'B'
  } else if (p.type === 'opposite') {
    channel = crossfaderValue < 0.5 ? 'B' : 'A'
  }

  store.dispatch(
    rSceneSelectChannel(p.id, channel)
  )
}

export default (action, store) => {
  switch (action.type) {
    case 'U_SCENE_CREATE':
      handleSceneCreate(action, store)
      break
    case 'U_SCENE_DELETE':
      handleSceneDelete(action, store)
      break
    case 'U_SCENE_SELECT_CHANNEL':
      handleSceneSelectChannel(action, store)
      break
    case 'SCENE_SKETCH_SELECT':
      handleSceneSketchSelect(action, store)
      break
  }
}
