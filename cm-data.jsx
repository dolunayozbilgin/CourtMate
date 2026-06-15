/* ===== CourtMate data ===== */
// expose React hooks as globals so every text/babel module can use them
Object.assign(window, {
  useState: React.useState, useEffect: React.useEffect,
  useRef: React.useRef, useCallback: React.useCallback, useMemo: React.useMemo,
});

(function () {
  // hue per player drives the photo-zone gradient placeholder
  const PLAYERS = [
    {
      id: 'emre', name: 'Emre K.', initials: 'EK', age: 28, level: 'Orta',
      utr: 'UTR 6.2', dist: '2.4 km', avail: 'Bugün 18:00 sonrası',
      form: '3G-2M', punc: '%94', style: 'Baseline', hand: 'Sağ el',
      score: 4.7, verified: true, hue: 78,
    },
    {
      id: 'deniz', name: 'Deniz A.', initials: 'DA', age: 24, level: 'Başlangıç',
      utr: 'UTR 2.1', dist: '1.1 km', avail: 'Yarın sabah',
      form: '2G-3M', punc: '%88', style: 'All-court', hand: 'Sol el',
      score: 4.4, verified: true, hue: 168,
    },
    {
      id: 'selin', name: 'Selin T.', initials: 'ST', age: 31, level: 'İleri',
      utr: 'UTR 9.4', dist: '3.8 km', avail: 'Hafta sonu',
      form: '4G-1M', punc: '%97', style: 'Servis-vole', hand: 'Sağ el',
      score: 4.9, verified: true, hue: 18,
    },
    {
      id: 'kaan', name: 'Kaan B.', initials: 'KB', age: 26, level: 'Orta',
      utr: 'UTR 5.6', dist: '0.8 km', avail: 'Bugün müsait',
      form: '3G-2M', punc: '%91', style: 'Baseline', hand: 'Sağ el',
      score: 4.5, verified: false, hue: 268,
    },
    {
      id: 'ipek', name: 'İpek M.', initials: 'İM', age: 22, level: 'Başlangıç',
      utr: 'UTR 1.8', dist: '4.2 km', avail: 'Akşamları',
      form: '1G-2M', punc: '%90', style: 'Defansif', hand: 'Sağ el',
      score: 4.6, verified: true, hue: 320,
    },
    {
      id: 'mert', name: 'Mert Y.', initials: 'MY', age: 34, level: 'İleri',
      utr: 'UTR 8.8', dist: '5.1 km', avail: 'Sabah erken',
      form: '5G-0M', punc: '%99', style: 'Agresif', hand: 'Sol el',
      score: 4.8, verified: true, hue: 210,
    },
    {
      id: 'ece', name: 'Ece D.', initials: 'ED', age: 29, level: 'Orta',
      utr: 'UTR 6.9', dist: '2.0 km', avail: 'Bugün 20:00',
      form: '4G-2M', punc: '%93', style: 'All-court', hand: 'Sağ el',
      score: 4.7, verified: true, hue: 48,
    },
    {
      id: 'baris', name: 'Barış O.', initials: 'BO', age: 27, level: 'İleri',
      utr: 'UTR 9.1', dist: '6.3 km', avail: 'Yarın akşam',
      form: '3G-1M', punc: '%95', style: 'Servis-vole', hand: 'Sağ el',
      score: 4.9, verified: false, hue: 132,
    },
  ];

  // which players "match back" when liked (mutual)
  const MUTUAL = new Set(['emre', 'selin', 'ece', 'mert', 'ipek']);

  const COURTS = [
    { id: 'maslak', name: 'Maslak Tenis Kulübü', meta: '1.2 km · 3 kort müsait · sert zemin' },
    { id: 'belgrad', name: 'Belgrad Orman Kortları', meta: '2.6 km · toprak · ışıklı' },
    { id: 'kemer', name: 'Kemer Country', meta: '4.0 km · kapalı kort · 2 müsait' },
  ];

  const DAYS = [
    { id: 'd0', d: 'Bugün', s: '7 Haz' },
    { id: 'd1', d: 'Yarın', s: '8 Haz' },
    { id: 'd2', d: 'Pzt', s: '9 Haz' },
    { id: 'd3', d: 'Sal', s: '10 Haz' },
  ];

  const TIMES = ['08:00', '10:00', '14:00', '18:00', '20:00'];

  const LEVELS = [
    { id: 'Başlangıç', label: 'Başlangıç', note: 'UTR 1–3' },
    { id: 'Orta', label: 'Orta', note: 'UTR 4–7' },
    { id: 'İleri', label: 'İleri', note: 'UTR 8+' },
  ];

  // photo-zone gradient from hue
  function photoGrad(hue) {
    return `linear-gradient(160deg,
      hsl(${hue} 55% 42%) 0%,
      hsl(${(hue + 28) % 360} 48% 26%) 55%,
      hsl(${(hue + 40) % 360} 40% 14%) 100%)`;
  }

  window.CM_DATA = { PLAYERS, MUTUAL, COURTS, DAYS, TIMES, LEVELS, photoGrad };
})();
