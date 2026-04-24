import { v4 as uuid } from 'uuid'

export function makeId(prefix = 'w') {
  return `${prefix}-${uuid().slice(0, 8)}`
}
