export type LogType = 'error' | 'warning' | 'info'

let active = false

export const setGlobalDatabaseLogStatus = (active: boolean) => {
  active = active
}

export const writeLog = (severity: LogType = 'info', ...content: any[]) => {
  switch (severity) {
    case 'error':
      active && console.error(content)
    case 'warning':
      active && console.warn(content)
    default:
      active && console.log(content)
  }
}