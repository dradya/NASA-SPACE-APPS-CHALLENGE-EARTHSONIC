// FIXTURES: synthetic text in the documented NASA file layouts, shared by the parser and loader tests.
// They are NOT NASA measurements; they only prove that code reads those layouts.

export const MONTHS = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'
export function gistempFixture(): string {
  let t = 'Land-Ocean: Global Means\nYear,' + MONTHS + ',J-D,D-N,DJF,MAM,JJA,SON\n'
  for (let y = 1900; y <= 1999; y++) {
    const jd = y === 1999 ? '***' : (((y - 1900) % 10) / 10).toFixed(2)
    t += `${y},${Array(12).fill('0.10').join(',')},${jd},***,0.1,0.1,0.1,0.1\n`
  }
  return t
}


export function nsidcFixture(): string {
  let t = 'Year, Month, Day, Extent, Missing, Source Data\nYYYY, MM, DD, 10^6 sq km, 10^6 sq km, Source data product web site: http://nsidc.org/d/\n'
  for (let i = 0; i < 1500; i++) t += `${1979 + Math.floor(i / 365)}, ${1 + Math.floor((i % 360) / 30)}, ${1 + (i % 28)}, ${i === 7 ? '-9999' : '10.5'}, 0.00, fixture\n`
  return t
}


export function gmslFixture(opts: { dropGia?: boolean } = {}): string {
  const hdr = [
    'HDR Global Mean Sea Level Time Series (FIXTURE)',
    'HDR Column 1: altimeter type',
    'HDR Column 2: merged file cycle #',
    'HDR Column 3: year+fraction of year (mid-cycle)',
    'HDR Column 4: number of observations',
    'HDR Column 5: number of weighted observations',
    'HDR Column 6: GMSL (Global Isostatic Adjustment (GIA) not applied) variation (mm) with respect to 20-year TOPEX/Jason collinear mean reference',
    'HDR Column 7: standard deviation of GMSL (GIA not applied) variation estimate (mm)',
    'HDR Column 8: smoothed (60-day Gaussian type filter) GMSL (GIA not applied) variation (mm)',
    'HDR Column 9: GMSL (Global Isostatic Adjustment (GIA) applied) variation (mm) with respect to 20-year TOPEX/Jason collinear mean reference',
    'HDR Column 10: standard deviation of GMSL (GIA applied) variation estimate (mm)',
    'HDR Column 11: smoothed (60-day Gaussian type filter) GMSL (GIA applied) variation (mm)',
    'HDR Column 12: smoothed (60-day Gaussian type filter) GMSL (GIA applied) variation (mm); annual and semi-annual signal removed',
  ]
  if (opts.dropGia) hdr.splice(10, 3)
  let t = hdr.join('\n') + '\n'
  for (let i = 0; i < 400; i++) {
    const year = (1993 + i * 0.0274).toFixed(4)
    const v = i === 5 ? 99900 : (i * 0.1).toFixed(2)
    t += `0 ${i + 1} ${year} 1000 900 ${v} 1.0 ${v} ${v} 1.0 ${i === 5 ? 99900 : 'X'.length * i * 0.1 + 111} ${v}\n`
  }
  return t
}


export function modisJson(year: number): unknown {
  const doys = [1, 17, 33, 49, 65, 81, 97, 113, 129, 145, 161, 177, 193, 209, 225, 241, 257, 273, 289, 305, 321, 337, 353]
  return { scale: '0.0001', subset: doys.map((d) => ({ modis_date: `A${year}${String(d).padStart(3, '0')}`, calendar_date: new Date(Date.UTC(year, 0, d)).toISOString().slice(0, 10), data: [4000 + d, 5000 + d, -3000] })) }
}
