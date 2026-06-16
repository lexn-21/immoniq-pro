-- Lösche fehlerhaften Demo-Datensatz (Bauzins 10J mit Wert 0)
DELETE FROM public.market_pulse WHERE metric = 'mortgage_rate_10y' AND value = 0;

-- Verhindere zukünftige Duplikate für dieselbe Metrik/Woche/Kombination
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_pulse_unique_week_metric
ON public.market_pulse (week_start, metric, city, zip_prefix) NULLS NOT DISTINCT;

-- Service-Role braucht weiterhin alle Rechte
GRANT ALL ON public.market_pulse TO service_role;