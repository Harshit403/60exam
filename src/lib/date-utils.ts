const IST_OFFSET = 5.5 * 60 * 60 * 1000

export function getISTNow(): Date {
  return new Date(new Date().getTime() + IST_OFFSET)
}

export function getISTDateString(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET)
  return `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, '0')}-${String(istDate.getUTCDate()).padStart(2, '0')}`
}

export function getISTTodayStart(): Date {
  const istNow = getISTNow()
  const iYear = istNow.getUTCFullYear()
  const iMonth = istNow.getUTCMonth()
  const iDate = istNow.getUTCDate()
  return new Date(Date.UTC(iYear, iMonth, iDate, 0, 0, 0, 0).valueOf() - IST_OFFSET)
}

export function getISTTodayEnd(): Date {
  const istNow = getISTNow()
  const iYear = istNow.getUTCFullYear()
  const iMonth = istNow.getUTCMonth()
  const iDate = istNow.getUTCDate()
  return new Date(Date.UTC(iYear, iMonth, iDate, 23, 59, 59, 999).valueOf() - IST_OFFSET)
}

export function isSameISTDay(date1: Date, date2: Date): boolean {
  return getISTDateString(date1) === getISTDateString(date2)
}
