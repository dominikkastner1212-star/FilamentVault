import { Calculator, ClipboardCheck, Copy, Gauge, Package, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCurrency, formatGrams } from '../lib/format';
import { FilamentRoll, MATERIALS, Material } from '../types';

type CalculatorPageProps = {
  rolls: FilamentRoll[];
};

type CalculatorState = {
  projectName: string;
  rollId: string;
  material: Material;
  materialPricePerKg: number;
  partWeightG: number;
  quantity: number;
  wastePercent: number;
  printHours: number;
  printMinutes: number;
  printerWatt: number;
  electricityPrice: number;
  machineRate: number;
  setupMinutes: number;
  laborRate: number;
  postProcessingCost: number;
  packagingCost: number;
  platformFeePercent: number;
  marginPercent: number;
  vatPercent: number;
};

type NumericField = Exclude<keyof CalculatorState, 'projectName' | 'rollId' | 'material'>;

const presets = [
  {
    label: 'Freundschaft',
    detail: 'fair und schlank',
    values: { marginPercent: 18, laborRate: 22, machineRate: 3.5, platformFeePercent: 0 }
  },
  {
    label: 'Standard',
    detail: 'sauber kalkuliert',
    values: { marginPercent: 35, laborRate: 35, machineRate: 5, platformFeePercent: 3 }
  },
  {
    label: 'Shop',
    detail: 'verkaufsbereit',
    values: { marginPercent: 55, laborRate: 45, machineRate: 7, platformFeePercent: 5 }
  }
] as const;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositive(value: number, min = 0) {
  return Math.max(min, Number.isFinite(value) ? value : min);
}

export function CalculatorPage({ rolls }: CalculatorPageProps) {
  const activeRolls = useMemo(
    () => rolls.filter((roll) => roll.status !== 'leer' && roll.remaining_weight_g > 0),
    [rolls]
  );
  const firstRoll = activeRolls[0];
  const [copied, setCopied] = useState(false);
  const [draftNumbers, setDraftNumbers] = useState<Partial<Record<NumericField, string>>>({});
  const [values, setValues] = useState<CalculatorState>({
    projectName: 'Druckauftrag',
    rollId: firstRoll?.id ?? '',
    material: firstRoll?.material ?? 'PLA',
    materialPricePerKg: firstRoll ? roundMoney((firstRoll.price / firstRoll.original_weight_g) * 1000) : 26,
    partWeightG: 120,
    quantity: 1,
    wastePercent: 12,
    printHours: 4,
    printMinutes: 30,
    printerWatt: 120,
    electricityPrice: 0.38,
    machineRate: 5,
    setupMinutes: 20,
    laborRate: 35,
    postProcessingCost: 4,
    packagingCost: 1.5,
    platformFeePercent: 3,
    marginPercent: 35,
    vatPercent: 19
  });

  const selectedRoll = activeRolls.find((roll) => roll.id === values.rollId) ?? null;
  const materialPricePerKg = selectedRoll
    ? roundMoney((selectedRoll.price / selectedRoll.original_weight_g) * 1000)
    : toPositive(values.materialPricePerKg);
  const pricePerGram = materialPricePerKg / 1000;
  const quantity = Math.max(1, Math.round(values.quantity || 1));
  const sellableWeight = toPositive(values.partWeightG) * quantity;
  const chargedWeight = sellableWeight * (1 + toPositive(values.wastePercent) / 100);
  const printTimeHours = toPositive(values.printHours) + toPositive(values.printMinutes) / 60;
  const totalPrintHours = printTimeHours * quantity;
  const setupHours = toPositive(values.setupMinutes) / 60;
  const energyKwh = (totalPrintHours * toPositive(values.printerWatt)) / 1000;
  const materialCost = chargedWeight * pricePerGram;
  const machineCost = totalPrintHours * toPositive(values.machineRate);
  const energyCost = energyKwh * toPositive(values.electricityPrice);
  const laborCost = setupHours * toPositive(values.laborRate);
  const baseCost =
    materialCost +
    machineCost +
    energyCost +
    laborCost +
    toPositive(values.postProcessingCost) +
    toPositive(values.packagingCost);
  const platformFee = baseCost * (toPositive(values.platformFeePercent) / 100);
  const costBeforeMargin = baseCost + platformFee;
  const marginAmount = costBeforeMargin * (toPositive(values.marginPercent) / 100);
  const netPrice = costBeforeMargin + marginAmount;
  const vatAmount = netPrice * (toPositive(values.vatPercent) / 100);
  const grossPrice = netPrice + vatAmount;
  const perPieceGross = grossPrice / quantity;
  const profitNet = netPrice - costBeforeMargin;
  const marginRatio = netPrice > 0 ? (profitNet / netPrice) * 100 : 0;

  function setField<K extends keyof CalculatorState>(key: K, value: CalculatorState[K]) {
    setCopied(false);
    setValues((current) => ({ ...current, [key]: value }));
  }

  function numericInputValue(key: NumericField, value: number) {
    return draftNumbers[key] ?? String(value);
  }

  function setNumericField(key: NumericField, raw: string, min = 0) {
    setCopied(false);
    setDraftNumbers((current) => ({ ...current, [key]: raw }));
    const nextValue = raw.trim() === '' ? min : toPositive(toNumber(raw), min);
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function commitNumericField(key: NumericField) {
    setDraftNumbers((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function setRangeField(key: NumericField, raw: string, min = 0) {
    setCopied(false);
    setValues((current) => ({ ...current, [key]: toPositive(toNumber(raw), min) }));
  }

  function selectRoll(rollId: string) {
    const roll = activeRolls.find((item) => item.id === rollId);
    setCopied(false);
    setDraftNumbers({});
    setValues((current) => ({
      ...current,
      rollId,
      material: roll?.material ?? current.material,
      materialPricePerKg: roll ? roundMoney((roll.price / roll.original_weight_g) * 1000) : current.materialPricePerKg
    }));
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setCopied(false);
    setDraftNumbers({});
    setValues((current) => ({ ...current, ...preset.values }));
  }

  const quoteText = [
    `${values.projectName || 'Druckauftrag'} - Richtpreis`,
    `Material: ${selectedRoll ? `${selectedRoll.manufacturer} ${selectedRoll.material} ${selectedRoll.color}` : values.material}`,
    `Menge: ${quantity} x ${formatGrams(values.partWeightG)} (${formatGrams(chargedWeight)} inkl. Ausschuss)`,
    `Druckzeit: ${totalPrintHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`,
    `Netto: ${formatCurrency(netPrice)}`,
    `Brutto: ${formatCurrency(grossPrice)} (${formatCurrency(perPieceGross)} pro Teil)`
  ].join('\n');

  async function copyQuote() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(quoteText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  return (
    <section className="page-stack calculator-page">
      <div className="calculator-hero">
        <div className="calculator-hero-copy">
          <span className="eyebrow">Auftragskalkulator</span>
          <h2>Vom Druckgewicht zum Verkaufspreis.</h2>
          <p>
            Material, Maschinenzeit, Energie, Arbeit und Marge laufen live zusammen. Rollenpreise aus dem Vault werden
            direkt übernommen.
          </p>
          <div className="preset-row" aria-label="Kalkulationsprofile">
            {presets.map((preset) => (
              <button type="button" className="preset-card" key={preset.label} onClick={() => applyPreset(preset)}>
                <strong>{preset.label}</strong>
                <span>{preset.detail}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="calculator-price-stage" aria-label="Preisvorschlag">
          <div className="shader-card">
            <div className="price-spool" aria-hidden="true" />
            <span>Empfohlener Bruttopreis</span>
            <strong>{formatCurrency(grossPrice)}</strong>
            <small>{formatCurrency(perPieceGross)} pro Teil</small>
          </div>
        </div>
      </div>

      <div className="calculator-layout">
        <form className="panel calculator-form" onSubmit={(event) => event.preventDefault()}>
          <div className="panel-header">
            <div>
              <h2>Parameter</h2>
              <p>Alles bleibt editierbar, damit Angebote schnell angepasst werden können.</p>
            </div>
            <Calculator size={18} />
          </div>

          <div className="calculator-section">
            <h3>Auftrag</h3>
            <div className="form-grid compact">
              <label className="form-grid-full">
                Projektname
                <input
                  value={values.projectName}
                  onChange={(event) => setField('projectName', event.target.value)}
                  placeholder="z. B. Halterung Kleinserie"
                />
              </label>
              <label>
                Materialquelle
                <select value={values.rollId} onChange={(event) => selectRoll(event.target.value)}>
                  <option value="">Eigener Materialpreis</option>
                  {activeRolls.map((roll) => (
                    <option key={roll.id} value={roll.id}>
                      {roll.manufacturer} - {roll.material} - {roll.color} - {formatGrams(roll.remaining_weight_g)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Material
                <select
                  value={values.material}
                  onChange={(event) => setField('material', event.target.value as Material)}
                  disabled={Boolean(selectedRoll)}
                >
                  {MATERIALS.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Materialpreis / kg
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={
                    selectedRoll ? materialPricePerKg : numericInputValue('materialPricePerKg', values.materialPricePerKg)
                  }
                  disabled={Boolean(selectedRoll)}
                  onChange={(event) => setNumericField('materialPricePerKg', event.target.value)}
                  onBlur={() => commitNumericField('materialPricePerKg')}
                />
              </label>
              <label>
                Teile
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={numericInputValue('quantity', values.quantity)}
                  onChange={(event) => setNumericField('quantity', event.target.value, 1)}
                  onBlur={() => commitNumericField('quantity')}
                />
              </label>
              <label>
                Gewicht pro Teil in g
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numericInputValue('partWeightG', values.partWeightG)}
                  onChange={(event) => setNumericField('partWeightG', event.target.value)}
                  onBlur={() => commitNumericField('partWeightG')}
                />
              </label>
              <label>
                Ausschuss / Reserve in %
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numericInputValue('wastePercent', values.wastePercent)}
                  onChange={(event) => setNumericField('wastePercent', event.target.value)}
                  onBlur={() => commitNumericField('wastePercent')}
                />
              </label>
            </div>
          </div>

          <div className="calculator-section">
            <h3>Zeit und Betrieb</h3>
            <div className="form-grid compact">
              <label>
                Druckzeit Stunden
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={numericInputValue('printHours', values.printHours)}
                  onChange={(event) => setNumericField('printHours', event.target.value)}
                  onBlur={() => commitNumericField('printHours')}
                />
              </label>
              <label>
                Druckzeit Minuten
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numericInputValue('printMinutes', values.printMinutes)}
                  onChange={(event) => setNumericField('printMinutes', event.target.value)}
                  onBlur={() => commitNumericField('printMinutes')}
                />
              </label>
              <label>
                Maschinenstundensatz
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={numericInputValue('machineRate', values.machineRate)}
                  onChange={(event) => setNumericField('machineRate', event.target.value)}
                  onBlur={() => commitNumericField('machineRate')}
                />
              </label>
              <label>
                Druckerleistung Watt
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numericInputValue('printerWatt', values.printerWatt)}
                  onChange={(event) => setNumericField('printerWatt', event.target.value)}
                  onBlur={() => commitNumericField('printerWatt')}
                />
              </label>
              <label>
                Strompreis / kWh
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={numericInputValue('electricityPrice', values.electricityPrice)}
                  onChange={(event) => setNumericField('electricityPrice', event.target.value)}
                  onBlur={() => commitNumericField('electricityPrice')}
                />
              </label>
              <label>
                Setup Minuten
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numericInputValue('setupMinutes', values.setupMinutes)}
                  onChange={(event) => setNumericField('setupMinutes', event.target.value)}
                  onBlur={() => commitNumericField('setupMinutes')}
                />
              </label>
            </div>
          </div>

          <div className="calculator-section">
            <h3>Preislogik</h3>
            <div className="form-grid compact">
              <label>
                Arbeitsstundensatz
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={numericInputValue('laborRate', values.laborRate)}
                  onChange={(event) => setNumericField('laborRate', event.target.value)}
                  onBlur={() => commitNumericField('laborRate')}
                />
              </label>
              <label>
                Nacharbeit pauschal
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={numericInputValue('postProcessingCost', values.postProcessingCost)}
                  onChange={(event) => setNumericField('postProcessingCost', event.target.value)}
                  onBlur={() => commitNumericField('postProcessingCost')}
                />
              </label>
              <label>
                Verpackung
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={numericInputValue('packagingCost', values.packagingCost)}
                  onChange={(event) => setNumericField('packagingCost', event.target.value)}
                  onBlur={() => commitNumericField('packagingCost')}
                />
              </label>
              <label>
                Plattformgebühr %
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={numericInputValue('platformFeePercent', values.platformFeePercent)}
                  onChange={(event) => setNumericField('platformFeePercent', event.target.value)}
                  onBlur={() => commitNumericField('platformFeePercent')}
                />
              </label>
              <label className="range-label">
                Marge %
                <span>{values.marginPercent}%</span>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={values.marginPercent}
                  onChange={(event) => setRangeField('marginPercent', event.target.value)}
                />
              </label>
              <label className="range-label">
                MwSt. %
                <span>{values.vatPercent}%</span>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={values.vatPercent}
                  onChange={(event) => setRangeField('vatPercent', event.target.value)}
                />
              </label>
            </div>
          </div>
        </form>

        <aside className="calculator-results">
          <section className="panel result-panel">
            <div className="panel-header">
              <div>
                <h2>Preisaufbau</h2>
                <p>Netto, Brutto und Marge für das Angebot.</p>
              </div>
              <Sparkles size={18} />
            </div>
            <div className="result-stack">
              <div className="result-total">
                <span>Brutto verkaufen für</span>
                <strong>{formatCurrency(grossPrice)}</strong>
                <small>{formatCurrency(perPieceGross)} pro Teil bei {quantity} Stück</small>
              </div>
              <div className="result-grid">
                <MetricCard icon={Package} label="Material" value={formatCurrency(materialCost)} detail={formatGrams(chargedWeight)} />
                <MetricCard icon={Gauge} label="Maschine" value={formatCurrency(machineCost)} detail={`${totalPrintHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`} />
                <MetricCard icon={Zap} label="Energie" value={formatCurrency(energyCost)} detail={`${energyKwh.toLocaleString('de-DE', { maximumFractionDigits: 2 })} kWh`} />
                <MetricCard icon={ClipboardCheck} label="Arbeit" value={formatCurrency(laborCost)} detail={`${values.setupMinutes} min Setup`} />
              </div>
              <div className="cost-lines">
                <CostLine label="Nacharbeit" value={values.postProcessingCost} />
                <CostLine label="Verpackung" value={values.packagingCost} />
                <CostLine label="Plattformgebühr" value={platformFee} />
                <CostLine label="Kosten vor Marge" value={costBeforeMargin} emphasized />
                <CostLine label="Marge netto" value={profitNet} />
                <CostLine label="Netto-Angebot" value={netPrice} emphasized />
                <CostLine label="MwSt." value={vatAmount} />
              </div>
            </div>
          </section>

          <section className="quote-panel">
            <div>
              <span>Angebotstext</span>
              <strong>{values.projectName || 'Druckauftrag'}</strong>
              <p>
                Deckungsbeitrag {marginRatio.toLocaleString('de-DE', { maximumFractionDigits: 1 })}% netto.
                Materialbasis: {selectedRoll ? selectedRoll.manufacturer : `${values.material} manuell`}.
              </p>
            </div>
            <pre>{quoteText}</pre>
            <button type="button" className="primary-button full" onClick={copyQuote}>
              {copied ? <ClipboardCheck size={17} /> : <Copy size={17} />}
              {copied ? 'Kopiert' : 'Angebot kopieren'}
            </button>
          </section>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-tile">
      <span>
        <Icon size={16} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  );
}

function CostLine({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) {
  return (
    <div className={emphasized ? 'cost-line emphasized' : 'cost-line'}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}
