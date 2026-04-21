import styles from './dateDivider.module.scss'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso) {
  const d = new Date(iso)
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function DateDivider({ date }) {
  return (
    <div className={styles.row}>
      <span className={styles.line} />
      <span>{formatDate(date)}</span>
      <span className={styles.line} />
    </div>
  )
}
