'use client';
import { useEffect, useRef, useState } from 'react';

const UP = '#b6f24a';
const DOWN = '#fb7185';
const DAY = 86400;

// Exchange-local calendar date ("2026-10-27") of a UTC epoch-seconds timestamp
const localDate = (sec, gmtoffset) => new Date((sec + gmtoffset) * 1000).toISOString().slice(0, 10);

// Lightweight Charts renders UTCTimestamps as UTC, so intraday bars are shifted by the exchange's
// UTC offset to show exchange time (as trading terminals do). Daily/weekly bars use business days.
function toChartTime(sec, data) {
  return data.intraday ? sec + data.gmtoffset : localDate(sec, data.gmtoffset);
}

function precisionFor(price) {
  if (!price) return 2;
  if (price < 1) return 4;
  if (price < 20) return 3;
  return 2;
}

/**
 * Candlestick/line price chart with volume, fed by /api/historical and kept live by merging
 * each new quote into the bar it belongs to.
 *
 * props: symbol, period ('1d'…'5y'), chartType ('candles' | 'line'), quote (latest /api/quote object)
 */
export default function PriceChart({ symbol, period, chartType = 'candles', quote, height = 440 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const lcRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const volSeriesRef = useRef(null);
  const prevCloseLineRef = useRef(null);
  const dataRef = useRef(null);      // { bars, intraday, intervalSeconds, gmtoffset, ... }
  const dayVolumeRef = useRef(null); // last cumulative day volume seen from quotes
  const [status, setStatus] = useState({ loading: true, error: null, stale: false });
  const [meta, setMeta] = useState(null);
  // Latest props for callbacks that run outside React's render (fetch results, live ticks)
  const propsRef = useRef({});
  propsRef.current = { chartType, quote, period };

  // Create the chart once
  useEffect(() => {
    let disposed = false;
    (async () => {
      const lc = await import('lightweight-charts');
      if (disposed || !containerRef.current) return;
      lcRef.current = lc;
      chartRef.current = lc.createChart(containerRef.current, {
        autoSize: true,
        layout: { background: { color: 'transparent' }, textColor: '#8a93b2', fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)', scaleMargins: { top: 0.08, bottom: 0.26 } },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)', rightOffset: 4, fixLeftEdge: true },
      });
      if (dataRef.current) draw();
    })();
    return () => {
      disposed = true;
      if (chartRef.current) chartRef.current.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volSeriesRef.current = null;
      prevCloseLineRef.current = null;
    };
  }, []);

  // Load bars whenever symbol or period changes
  useEffect(() => {
    if (!symbol) return;
    const ctrl = new AbortController();
    setStatus({ loading: true, error: null, stale: false });
    fetch(`/api/historical?symbol=${encodeURIComponent(symbol)}&period=${period}&_t=${Date.now()}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.bars) throw new Error(data.error || 'No chart data');
        dataRef.current = data;
        dayVolumeRef.current = null;
        setMeta({ timezoneAbbr: data.timezoneAbbr, intraday: data.intraday, interval: data.interval, bars: data.bars.length });
        setStatus({ loading: false, error: data.bars.length ? null : 'No trades in this range', stale: !!data.stale });
        draw();
      })
      .catch(err => { if (err.name !== 'AbortError') setStatus({ loading: false, error: 'Chart data unavailable — retrying on next refresh', stale: false }); });
    return () => ctrl.abort();
  }, [symbol, period]);

  // Redraw when the chart style changes
  useEffect(() => { if (dataRef.current) draw(); }, [chartType]);

  // Keep the previous-close reference line in sync with the quote
  useEffect(() => { drawPrevClose(); }, [quote?.previousClose, period]);

  // Merge each live quote into the current bar
  useEffect(() => { applyQuote(quote); }, [quote?.price, quote?.marketTime, quote?.volume]);

  function draw() {
    const chart = chartRef.current, lc = lcRef.current, data = dataRef.current;
    if (!chart || !lc || !data) return;
    const { chartType, quote, period } = propsRef.current;

    if (priceSeriesRef.current) { chart.removeSeries(priceSeriesRef.current); priceSeriesRef.current = null; prevCloseLineRef.current = null; }
    if (volSeriesRef.current) { chart.removeSeries(volSeriesRef.current); volSeriesRef.current = null; }

    const bars = data.bars;
    const precision = precisionFor(bars[bars.length - 1]?.close);
    const priceFormat = { type: 'price', precision, minMove: 1 / 10 ** precision };

    chart.applyOptions({ timeScale: { timeVisible: data.intraday, secondsVisible: false } });

    if (chartType === 'line') {
      const first = bars[0]?.close, last = bars[bars.length - 1]?.close;
      const ref = period === '1d' && quote?.previousClose ? quote.previousClose : first;
      const up = last == null || ref == null || last >= ref;
      priceSeriesRef.current = chart.addSeries(lc.AreaSeries, {
        lineColor: up ? UP : DOWN, lineWidth: 2, priceFormat,
        topColor: up ? 'rgba(182,242,74,0.28)' : 'rgba(251,113,133,0.28)',
        bottomColor: up ? 'rgba(182,242,74,0)' : 'rgba(251,113,133,0)',
      });
      priceSeriesRef.current.setData(bars.map(b => ({ time: toChartTime(b.time, data), value: b.close })));
    } else {
      priceSeriesRef.current = chart.addSeries(lc.CandlestickSeries, {
        upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, priceFormat,
      });
      priceSeriesRef.current.setData(bars.map(b => ({ time: toChartTime(b.time, data), open: b.open, high: b.high, low: b.low, close: b.close })));
    }

    volSeriesRef.current = chart.addSeries(lc.HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeriesRef.current.setData(bars.map(b => ({ time: toChartTime(b.time, data), value: b.volume, color: volColor(b) })));

    drawPrevClose();
    chart.timeScale().fitContent();
  }

  function volColor(b) {
    return b.close >= b.open ? 'rgba(182,242,74,0.35)' : 'rgba(251,113,133,0.35)';
  }

  function drawPrevClose() {
    const series = priceSeriesRef.current, lc = lcRef.current;
    if (!series || !lc) return;
    const { quote, period } = propsRef.current;
    if (prevCloseLineRef.current) { series.removePriceLine(prevCloseLineRef.current); prevCloseLineRef.current = null; }
    if (period === '1d' && quote?.previousClose) {
      prevCloseLineRef.current = series.createPriceLine({
        price: quote.previousClose, color: 'rgba(195,201,224,0.55)', lineWidth: 1,
        lineStyle: lc.LineStyle.Dashed, axisLabelVisible: true, title: 'Prev close',
      });
    }
  }

  function applyQuote(q) {
    const data = dataRef.current, series = priceSeriesRef.current;
    if (!q || !q.price || !q.marketTime || !data || !series || !data.bars.length) return;
    if (q.symbol && q.symbol !== data.symbol) return;
    const { chartType } = propsRef.current;

    const bars = data.bars;
    const last = bars[bars.length - 1];
    const tradeSec = Math.floor(q.marketTime / 1000);
    if (tradeSec < last.time) return; // older than what we already have

    // Volume added since the previous quote (quotes carry the cumulative day volume)
    let volDelta = 0;
    if (q.volume != null) {
      if (dayVolumeRef.current != null && q.volume >= dayVolumeRef.current) volDelta = q.volume - dayVolumeRef.current;
      dayVolumeRef.current = q.volume;
    }

    let bar;
    if (data.intraday) {
      // A trade on a new calendar day belongs to a session we don't hold yet; leave it for the next reload
      if (localDate(tradeSec, data.gmtoffset) !== localDate(last.time, data.gmtoffset)) return;
      const bucket = Math.floor(tradeSec / data.intervalSeconds) * data.intervalSeconds;
      if (bucket === last.time) {
        bar = last;
        bar.high = Math.max(bar.high, q.price); bar.low = Math.min(bar.low, q.price); bar.close = q.price; bar.volume += volDelta;
      } else {
        bar = { time: bucket, open: last.close, high: Math.max(last.close, q.price), low: Math.min(last.close, q.price), close: q.price, volume: volDelta };
        bars.push(bar);
      }
    } else {
      const tradeDay = localDate(tradeSec, data.gmtoffset);
      const lastDay = localDate(last.time, data.gmtoffset);
      const sameBar = data.interval === '1wk'
        ? (Date.parse(tradeDay) - Date.parse(lastDay)) / 1000 < 7 * DAY
        : tradeDay === lastDay;
      if (sameBar) {
        bar = last;
        bar.high = Math.max(bar.high, q.price); bar.low = Math.min(bar.low, q.price); bar.close = q.price;
        if (data.interval === '1d' && q.volume != null) bar.volume = q.volume;
      } else {
        const open = q.open || q.price;
        bar = { time: tradeSec, open, high: Math.max(open, q.dayHigh || q.price), low: Math.min(open, q.dayLow || q.price), close: q.price, volume: q.volume || 0 };
        bars.push(bar);
      }
    }

    const time = toChartTime(bar.time, data);
    try {
      series.update(chartType === 'line' ? { time, value: bar.close } : { time, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
      volSeriesRef.current?.update({ time, value: bar.volume, color: volColor(bar) });
    } catch { /* out-of-order update: the next full reload resyncs */ }
  }

  const intervalLabel = { '1m': '1-min', '5m': '5-min', '30m': '30-min', '1d': 'Daily', '1wk': 'Weekly' }[meta?.interval] || '';

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        {(status.loading || status.error) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {status.loading ? <div className="spinner" /> : status.error}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>
          {intervalLabel && `${intervalLabel} ${chartType === 'line' ? 'closes' : 'candles'}`}
          {meta?.intraday && meta.timezoneAbbr && ` · Times in ${meta.timezoneAbbr} (exchange time)`}
          {period === '1d' && ' · Latest session'}
        </span>
        {status.stale && <span style={{ color: 'var(--accent-amber)' }}>Showing last saved data — live source unreachable</span>}
      </div>
    </div>
  );
}
