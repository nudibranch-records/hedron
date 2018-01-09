import { select, takeEvery, put, call } from 'redux-saga/effects'
import { getAssignedLinks } from './selectors'
import { nodeValueUpdate } from '../nodes/actions'
import { inputLinkShotFired, inputLinkShotDisarm, inputLinkShotArm } from '../inputLinks/actions'
import { projectError } from '../project/actions'
import getNodes from '../../selectors/getNodes'
import getNode from '../../selectors/getNode'
import getLinkableAction from '../../selectors/getLinkableAction'
import getNodesValues from '../../selectors/getNodesValues'
import getCurrentBankIndex from '../../selectors/getCurrentBankIndex'
import lfoProcess from '../../utils/lfoProcess'
import midiValueProcess from '../../utils/midiValueProcess'
import { work } from '../../externals/modifiers'
import debounceInput from '../../utils/debounceInput'

// let frameHasPassed = true
// let messageCount = 1

export function* handleInput (action) {
  const p = action.payload
  const messageCount = yield call(debounceInput, p)
  if (messageCount) {
    try {
      const links = yield select(getAssignedLinks, p.inputId)

      for (let i = 0; i < links.length; i++) {
        if (links[i].linkType === 'linkableAction') {
          const linkableAction = yield select(getLinkableAction, links[i].nodeId)
          yield put(linkableAction.action)
        } else {
          let value = p.value
          let modifiers
          let skip
          if (p.meta && p.meta.type === 'midi') {
            const currentDeviceBank = yield select(getCurrentBankIndex, links[i].deviceId)
            if (currentDeviceBank !== links[i].bankIndex) skip = true

            if (!skip) {
              const currNode = yield select(getNode, links[i].nodeId)

              let midiValue = value
              value = currNode.value
              const o = yield select(getNodesValues, links[i].midiOptionIds)
              value = yield call(midiValueProcess, value, midiValue, messageCount, o.sensitity, currNode)
            }
          }

          if (!skip) {
            if (p.inputId === 'lfo') {
              let o = yield select(getNodesValues, links[i].lfoOptionIds)
              value = yield call(lfoProcess, value, o.shape, o.rate)
            }

            if (links[i].modifierIds && links[i].modifierIds.length) {
              modifiers = yield select(getNodes, links[i].modifierIds)
              let vals = []
              for (let j = 0; j < modifiers.length; j++) {
                const m = modifiers[j]
                if (!m.type || m.type === p.type) {
                  vals.push(m.value)
                  if (!m.passToNext) {
                    value = yield call(work, m.key, vals, value)
                    value = Math.max(0, Math.min(1, value))
                    vals = []
                  }
                }
              }
            }

            switch (links[i].nodeType) {
              case 'shot': {
                const node = yield select(getNode, links[i].nodeId)
                if (p.meta && p.meta.noteOn) {
                  yield put(inputLinkShotFired(node.sketchId, node.method))
                } else if (value > 0.5 && links[i].armed) {
                  yield put(inputLinkShotFired(node.sketchId, node.method))
                  yield put(inputLinkShotDisarm(links[i].id))
                } else if (value < 0.5) {
                  yield put(inputLinkShotArm(links[i].id))
                }
                break
              }
              case 'macro': {
                if (p.meta && p.meta.noteOn) {
                  value = 1
                }
              }
            }

            yield put(nodeValueUpdate(links[i].nodeId, value, p.meta))
          }
        }
      }
    } catch (error) {
      console.error(error)
      yield put(projectError(error.message))
    }
  }
}

export function* watchInputs () {
  yield takeEvery('INPUT_FIRED', handleInput)
}