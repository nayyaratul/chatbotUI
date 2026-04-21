import cx from 'classnames'
import styles from '../styles/deviceFrame.module.scss'
import { useViewport } from './ViewportContext.jsx'

export function DeviceFrame({ children }) {
  const { viewport } = useViewport()
  return (
    <div className={cx(styles.frame, styles[viewport])}>
      {children}
    </div>
  )
}
