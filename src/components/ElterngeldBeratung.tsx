import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, ArrowLeft, HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { ThinkingAnimation } from "./ThinkingAnimation";

// ============================================
// TYPES
// ============================================

interface BeratungMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  component?: React.ReactNode;
}

interface BeratungData {
  geburtstermin?: string;
  schonGeboren?: "ja" | "nein";
  situation?: "paar" | "alleinerziehend";
  beschaeftigung?: "angestellt" | "selbstaendig" | "beides" | "nicht";
  brutto?: number;
  partnerBeschaeftigung?: "angestellt" | "selbstaendig" | "beides" | "nicht";
  partnerBrutto?: number;
  eigeneMonate?: number;
  partnerMonate?: number;
  istMutterAngestellt?: "ja" | "nein";
  geschwister?: "nein" | "ja";
  arbeitenWaehrend?: "nein" | "teilzeit" | "vielleicht";
}

interface FlowStep {
  id: string;
  messages: FlowMessage[];
  next: string | ((data: BeratungData) => string) | null;
}

interface FlowMessage {
  type: "text" | "question" | "calculation" | "card" | "timeline" | "optimization" | "summary" | "checklist";
  content?: string;
  inputType?: "buttons" | "date" | "slider";
  field?: keyof BeratungData;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
  calculationType?: string;
  cardType?: string;
  timelineType?: string;
  optimizationType?: string;
  summaryType?: string;
  checklistType?: string;
}

interface ElterngeldBeratungProps {
  onSendMessage: (message: string) => Promise<void>;
  aiMessages: { role: string; content: string }[];
  isAiLoading: boolean;
  onBack?: () => void;
}

// ============================================
// FLOW DEFINITION
// ============================================

const BERATUNG_FLOW: Record<string, FlowStep> = {
  intro: {
    id: "intro",
    messages: [
      { type: "text", content: "Hallo! 👋 Schön, dass du da bist." },
      { type: "text", content: "Ich führe dich durch eine **komplette Elterngeld-Beratung**. In etwa 15 Minuten weißt du:" },
      { type: "text", content: "✓ Wie viel Elterngeld dir zusteht\n✓ Wie ihr optimal aufteilen solltet\n✓ Was du beantragen musst" },
      { type: "text", content: "💡 **Tipp:** Du kannst mich jederzeit unterbrechen und Fragen stellen!" },
    ],
    next: "geburt",
  },

  geburt: {
    id: "geburt",
    messages: [
      { type: "question", content: "Wann ist der Geburtstermin?", inputType: "date", field: "geburtstermin" },
    ],
    next: "geboren",
  },

  geboren: {
    id: "geboren",
    messages: [
      {
        type: "question",
        content: "Ist das Kind schon geboren?",
        inputType: "buttons",
        field: "schonGeboren",
        options: [
          { value: "ja", label: "Ja, bereits geboren" },
          { value: "nein", label: "Nein, noch nicht" },
        ],
      },
    ],
    next: "situation",
  },

  situation: {
    id: "situation",
    messages: [
      {
        type: "question",
        content: "Wie ist eure Familiensituation?",
        inputType: "buttons",
        field: "situation",
        options: [
          { value: "paar", label: "👫 Wir sind zu zweit" },
          { value: "alleinerziehend", label: "👤 Ich bin alleinerziehend" },
        ],
      },
    ],
    next: (data) => (data.situation === "paar" ? "partnerIntro" : "alleinerziehendInfo"),
  },

  alleinerziehendInfo: {
    id: "alleinerziehendInfo",
    messages: [
      {
        type: "text",
        content:
          "👍 Als Alleinerziehende/r hast du einen Vorteil: Du bekommst **alle 14 Monate Basiselterngeld** alleine – normalerweise müssen Paare sich diese teilen.",
      },
    ],
    next: "einkommenIntro",
  },

  partnerIntro: {
    id: "partnerIntro",
    messages: [
      { type: "text", content: "Super! Bei Paaren ist die **Aufteilung** der Schlüssel. Dazu kommen wir gleich." },
    ],
    next: "einkommenIntro",
  },

  einkommenIntro: {
    id: "einkommenIntro",
    messages: [
      { type: "text", content: "💰 **Jetzt zum Einkommen** – das ist die Basis für dein Elterngeld." },
      {
        type: "text",
        content:
          "Das Elterngeld ersetzt **65% deines Nettoeinkommens** (bei niedrigem Einkommen bis 100%, bei hohem etwas weniger). Minimum: 300€, Maximum: 1.800€ pro Monat.",
      },
    ],
    next: "einkommenTyp",
  },

  einkommenTyp: {
    id: "einkommenTyp",
    messages: [
      {
        type: "question",
        content: "Wie bist du aktuell beschäftigt?",
        inputType: "buttons",
        field: "beschaeftigung",
        options: [
          { value: "angestellt", label: "💼 Angestellt" },
          { value: "selbstaendig", label: "🏠 Selbstständig" },
          { value: "beides", label: "↔️ Beides" },
          { value: "nicht", label: "❌ Nicht erwerbstätig" },
        ],
      },
    ],
    next: (data) => (data.beschaeftigung === "nicht" ? "keinEinkommen" : "einkommenHoehe"),
  },

  keinEinkommen: {
    id: "keinEinkommen",
    messages: [
      { type: "text", content: "Auch ohne Einkommen hast du Anspruch auf den **Mindestbetrag von 300€/Monat**." },
    ],
    next: (data) => (data.situation === "paar" ? "partnerEinkommen" : "elterngeldErklaerung"),
  },

  einkommenHoehe: {
    id: "einkommenHoehe",
    messages: [
      {
        type: "question",
        content: "Was ist ungefähr dein **monatliches Brutto**?",
        inputType: "slider",
        field: "brutto",
        min: 0,
        max: 8000,
        step: 100,
        unit: "€",
        hint: "Vor Steuern und Abzügen. Muss nicht exakt sein!",
      },
    ],
    next: "einkommenBerechnung",
  },

  einkommenBerechnung: {
    id: "einkommenBerechnung",
    messages: [{ type: "calculation", calculationType: "elterngeld" }],
    next: (data) => (data.situation === "paar" ? "partnerEinkommen" : "elterngeldErklaerung"),
  },

  partnerEinkommen: {
    id: "partnerEinkommen",
    messages: [
      {
        type: "question",
        content: "Wie ist dein/e Partner/in beschäftigt?",
        inputType: "buttons",
        field: "partnerBeschaeftigung",
        options: [
          { value: "angestellt", label: "💼 Angestellt" },
          { value: "selbstaendig", label: "🏠 Selbstständig" },
          { value: "beides", label: "↔️ Beides" },
          { value: "nicht", label: "❌ Nicht erwerbstätig" },
        ],
      },
    ],
    next: (data) => (data.partnerBeschaeftigung === "nicht" ? "elterngeldErklaerung" : "partnerEinkommenHoehe"),
  },

  partnerEinkommenHoehe: {
    id: "partnerEinkommenHoehe",
    messages: [
      {
        type: "question",
        content: "Ungefähres **Brutto des Partners**?",
        inputType: "slider",
        field: "partnerBrutto",
        min: 0,
        max: 8000,
        step: 100,
        unit: "€",
      },
    ],
    next: "partnerBerechnung",
  },

  partnerBerechnung: {
    id: "partnerBerechnung",
    messages: [{ type: "calculation", calculationType: "partnerElterngeld" }],
    next: "elterngeldErklaerung",
  },

  elterngeldErklaerung: {
    id: "elterngeldErklaerung",
    messages: [
      { type: "text", content: "📚 **Die 3 Elterngeld-Arten kurz erklärt:**" },
      { type: "card", cardType: "elterngeldArten" },
    ],
    next: "planungIntro",
  },

  planungIntro: {
    id: "planungIntro",
    messages: [
      { type: "text", content: "📅 **Jetzt zur Planung** – hier entscheidet sich, wie viel ihr bekommt." },
      {
        type: "question",
        content: "Wie lange möchtest du ungefähr zuhause bleiben?",
        inputType: "buttons",
        field: "eigeneMonate",
        options: [
          { value: "2", label: "2 Monate" },
          { value: "6", label: "6 Monate" },
          { value: "12", label: "12 Monate" },
          { value: "14", label: "14+ Monate" },
        ],
      },
    ],
    next: (data) => (data.situation === "paar" ? "partnerMonate" : "planungTimeline"),
  },

  partnerMonate: {
    id: "partnerMonate",
    messages: [
      {
        type: "question",
        content: "Und dein/e Partner/in?",
        inputType: "buttons",
        field: "partnerMonate",
        options: [
          { value: "0", label: "Gar nicht" },
          { value: "2", label: "2 Monate" },
          { value: "6", label: "6 Monate" },
          { value: "12", label: "12 Monate" },
        ],
      },
    ],
    next: "planungTimeline",
  },

  planungTimeline: {
    id: "planungTimeline",
    messages: [
      { type: "text", content: "Basierend auf euren Wünschen:" },
      { type: "timeline", timelineType: "vorschlag" },
    ],
    next: "optimierungCheck",
  },

  optimierungCheck: {
    id: "optimierungCheck",
    messages: [
      { type: "text", content: "🎯 **Optimierungs-Check**" },
      { type: "optimization", optimizationType: "check" },
    ],
    next: "mutterschutz",
  },

  mutterschutz: {
    id: "mutterschutz",
    messages: [
      {
        type: "question",
        content: "Bist du die leibliche Mutter und angestellt?",
        inputType: "buttons",
        field: "istMutterAngestellt",
        options: [
          { value: "ja", label: "Ja" },
          { value: "nein", label: "Nein" },
        ],
      },
    ],
    next: (data) => (data.istMutterAngestellt === "ja" ? "mutterschutzInfo" : "arbeitenWaehrend"),
  },

  mutterschutzInfo: {
    id: "mutterschutzInfo",
    messages: [
      { type: "text", content: "🤰 **Wichtig: Mutterschutz ≠ Elterngeld**" },
      {
        type: "text",
        content:
          "Die ersten 8 Wochen nach Geburt bekommst du **Mutterschaftsgeld** (Krankenkasse + Arbeitgeber). Das Elterngeld startet erst danach – du 'verlierst' aber keine Monate!",
      },
    ],
    next: "arbeitenWaehrend",
  },

  arbeitenWaehrend: {
    id: "arbeitenWaehrend",
    messages: [
      {
        type: "question",
        content: "Planst du, während des Elterngeldbezugs zu arbeiten?",
        inputType: "buttons",
        field: "arbeitenWaehrend",
        options: [
          { value: "nein", label: "Nein" },
          { value: "teilzeit", label: "Ja, Teilzeit" },
          { value: "vielleicht", label: "Vielleicht" },
        ],
      },
    ],
    next: (data) => (data.arbeitenWaehrend === "teilzeit" ? "teilzeitTipp" : "geschwister"),
  },

  teilzeitTipp: {
    id: "teilzeitTipp",
    messages: [
      { type: "text", content: "💡 **Tipp bei Teilzeit:** ElterngeldPlus ist oft besser!" },
      {
        type: "text",
        content:
          "Bei Teilzeit wird Basiselterngeld stark gekürzt. ElterngeldPlus ist zwar halb so hoch, läuft aber doppelt so lang – und wird weniger gekürzt.",
      },
    ],
    next: "geschwister",
  },

  geschwister: {
    id: "geschwister",
    messages: [
      {
        type: "question",
        content: "Habt ihr weitere Kinder unter 6 Jahren?",
        inputType: "buttons",
        field: "geschwister",
        options: [
          { value: "nein", label: "Nein" },
          { value: "ja", label: "Ja" },
        ],
      },
    ],
    next: (data) => (data.geschwister === "ja" ? "geschwisterBonus" : "zusammenfassung"),
  },

  geschwisterBonus: {
    id: "geschwisterBonus",
    messages: [
      {
        type: "text",
        content: "🎁 **Geschwisterbonus!** Du bekommst **+10%** auf dein Elterngeld (mind. +75€/Monat).",
      },
    ],
    next: "zusammenfassung",
  },

  zusammenfassung: {
    id: "zusammenfassung",
    messages: [
      { type: "text", content: "✅ **Deine persönliche Zusammenfassung**" },
      { type: "summary", summaryType: "full" },
    ],
    next: "naechsteSchritte",
  },

  naechsteSchritte: {
    id: "naechsteSchritte",
    messages: [
      { type: "text", content: "📋 **Deine nächsten Schritte:**" },
      { type: "checklist", checklistType: "nextSteps" },
      {
        type: "text",
        content: "Das war die Beratung! Hast du noch Fragen? Ich bin jetzt im **freien Chat-Modus** – frag mich alles! 💬",
      },
    ],
    next: "frei",
  },

  frei: {
    id: "frei",
    messages: [],
    next: null,
  },
};

// ============================================
// CALCULATION FUNCTIONS
// ============================================

const berechneElterngeld = (brutto: number | undefined) => {
  if (!brutto || brutto === 0) return { netto: 0, elterngeld: 300, ersatzrate: 100 };

  const steuerRate = brutto > 5000 ? 0.58 : brutto > 3000 ? 0.62 : brutto > 1500 ? 0.67 : 0.75;
  const netto = Math.round(brutto * steuerRate);

  let ersatzrate: number;
  if (netto < 1000) {
    ersatzrate = Math.min(1, 0.67 + ((1000 - netto) / 1000) * 0.33);
  } else if (netto > 1200) {
    ersatzrate = Math.max(0.65, 0.65 - ((netto - 1200) / 1000) * 0.01);
  } else {
    ersatzrate = 0.65;
  }

  let elterngeld = Math.round(netto * ersatzrate);
  elterngeld = Math.max(300, Math.min(1800, elterngeld));

  return { netto, elterngeld, ersatzrate: Math.round(ersatzrate * 100) };
};

// ============================================
// SUB-COMPONENTS
// ============================================

const ElterngeldArtenCard = () => (
  <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden my-3">
    <div className="divide-y divide-border">
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
          B
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Basiselterngeld</p>
          <p className="text-xs text-muted-foreground">65% vom Netto, max 14 Monate zusammen</p>
        </div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">
          P
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">ElterngeldPlus</p>
          <p className="text-xs text-muted-foreground">Halb so viel, doppelt so lang</p>
        </div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
          PB
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Partnerschaftsbonus</p>
          <p className="text-xs text-muted-foreground">4 Extra-Monate bei 24-32h Teilzeit</p>
        </div>
      </div>
    </div>
  </div>
);

const CalculationDisplay = ({ data, type }: { data: BeratungData; type: string }) => {
  const brutto = type === "partnerElterngeld" ? data.partnerBrutto : data.brutto;
  const result = berechneElterngeld(brutto);
  const label = type === "partnerElterngeld" ? "Partner" : "Du";

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 my-3 border border-blue-100">
      <p className="text-sm text-blue-600 font-medium mb-1">📊 {label}: Geschätztes Elterngeld</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-foreground">{result.elterngeld.toLocaleString()}€</span>
        <span className="text-muted-foreground mb-1">/ Monat</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {result.ersatzrate}% von ca. {result.netto.toLocaleString()}€ Netto
      </p>
    </div>
  );
};

const TimelineVorschlag = ({ data }: { data: BeratungData }) => {
  const isAlleinerziehend = data.situation === "alleinerziehend";
  const eigeneMonate = Number(data.eigeneMonate) || 12;
  const partnerMonate = isAlleinerziehend ? 0 : Number(data.partnerMonate) || 2;

  const result1 = berechneElterngeld(data.brutto);
  const result2 = berechneElterngeld(data.partnerBrutto);

  const bonus = data.geschwister === "ja" ? 1.1 : 1;
  const gesamt = Math.round(
    ((result1.elterngeld * Math.min(eigeneMonate, 14)) +
      (result2.elterngeld * Math.min(partnerMonate, 14 - Math.min(eigeneMonate, 12)))) *
      bonus
  );

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4 my-3">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 14 }, (_, i) => {
          const monat = i + 1;
          const istDu = monat <= Math.min(eigeneMonate, isAlleinerziehend ? 14 : 12);
          const istPartner = !isAlleinerziehend && monat > eigeneMonate && monat <= eigeneMonate + partnerMonate;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 h-8 rounded flex items-center justify-center text-xs font-bold text-white",
                istDu ? "bg-blue-500" : istPartner ? "bg-purple-500" : "bg-muted text-muted-foreground"
              )}
            >
              {monat}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs mb-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded" /> Du
        </span>
        {!isAlleinerziehend && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500 rounded" /> Partner
          </span>
        )}
      </div>
      <div className="pt-3 border-t border-border">
        <p className="text-sm text-muted-foreground">Geschätzte Gesamtsumme:</p>
        <p className="text-2xl font-bold text-green-600">{gesamt.toLocaleString()}€</p>
      </div>
    </div>
  );
};

const OptimizationCheck = ({ data }: { data: BeratungData }) => {
  const tipps: { icon: string; title: string; text: string }[] = [];

  if (data.situation === "paar" && Number(data.partnerMonate) === 0) {
    tipps.push({
      icon: "💡",
      title: "Partner-Monate nutzen!",
      text: "2 Monate vom Partner = 2 Extra-Monate Elterngeld. Oft 2.000-3.000€ mehr!",
    });
  }

  if (Number(data.brutto) > 2500 && Number(data.partnerBrutto || 0) < 2000 && data.situation === "paar") {
    tipps.push({
      icon: "💰",
      title: "Einkommensoptimierung",
      text: "Der Besserverdiener bekommt mehr Elterngeld. Prüft, ob eine andere Aufteilung sinnvoll ist.",
    });
  }

  if (tipps.length === 0) {
    tipps.push({ icon: "✅", title: "Sieht gut aus!", text: "Eure Planung ist solide." });
  }

  return (
    <div className="space-y-2 my-3">
      {tipps.map((tipp, i) => (
        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
          <span className="text-xl">{tipp.icon}</span>
          <div>
            <p className="font-semibold text-amber-900 text-sm">{tipp.title}</p>
            <p className="text-xs text-amber-800">{tipp.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const SummaryCard = ({ data }: { data: BeratungData }) => {
  const result1 = berechneElterngeld(data.brutto);
  const result2 = berechneElterngeld(data.partnerBrutto);
  const isAlleinerziehend = data.situation === "alleinerziehend";
  const eigeneMonate = Number(data.eigeneMonate) || 12;
  const partnerMonate = isAlleinerziehend ? 0 : Number(data.partnerMonate) || 0;

  const bonus = data.geschwister === "ja" ? 1.1 : 1;
  const gesamt = Math.round(((result1.elterngeld * eigeneMonate) + (result2.elterngeld * partnerMonate)) * bonus);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 my-3">
      <div className="space-y-3">
        <div>
          <p className="text-sm text-green-700 font-medium">👤 Du</p>
          <p className="text-lg font-bold text-foreground">
            {result1.elterngeld.toLocaleString()}€ × {eigeneMonate} Monate
          </p>
        </div>
        {!isAlleinerziehend && partnerMonate > 0 && (
          <div>
            <p className="text-sm text-green-700 font-medium">👤 Partner</p>
            <p className="text-lg font-bold text-foreground">
              {result2.elterngeld.toLocaleString()}€ × {partnerMonate} Monate
            </p>
          </div>
        )}
        {data.geschwister === "ja" && <p className="text-sm text-green-700">+ 10% Geschwisterbonus</p>}
        <div className="pt-3 border-t border-green-200">
          <p className="text-sm text-green-700">Geschätzte Gesamtsumme</p>
          <p className="text-3xl font-bold text-green-700">{gesamt.toLocaleString()}€</p>
        </div>
      </div>
    </div>
  );
};

const ChecklistCard = ({ data }: { data: BeratungData }) => {
  const items = [
    "Geburtsurkunde besorgen",
    "Elterngeld-Antrag ausfüllen",
    "Einkommensnachweise sammeln (letzte 12 Monate)",
  ];
  if (data.istMutterAngestellt === "ja") items.splice(1, 0, "Mutterschaftsgeld beantragen");
  if (data.beschaeftigung === "angestellt") items.push("Elternzeit anmelden (7 Wochen vorher!)");

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4 my-3">
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SliderInput = ({
  min,
  max,
  step,
  unit,
  hint,
  onSubmit,
}: {
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
  onSubmit: (value: number) => void;
}) => {
  const [value, setValue] = useState(3000);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4 my-3">
      <div className="text-center mb-4">
        <span className="text-4xl font-bold text-foreground">{value.toLocaleString()}</span>
        <span className="text-xl text-muted-foreground">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>
          {min.toLocaleString()}
          {unit}
        </span>
        <span>
          {max.toLocaleString()}
          {unit}
        </span>
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-2 text-center">{hint}</p>}
      <Button onClick={() => onSubmit(value)} className="w-full mt-4">
        Weiter
      </Button>
    </div>
  );
};

const MessageBubble = ({ content, isUser }: { content: string; isUser: boolean }) => {
  const formatText = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/).map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <div className={cn("flex mb-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm",
          isUser ? "bg-[#F3F3F3] text-foreground rounded-br-md" : "bg-transparent text-foreground"
        )}
      >
        {isUser ? (
          <span className="leading-relaxed">{content}</span>
        ) : (
          <div className="prose prose-sm max-w-none leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

let messageIdCounter = 0;
const generateMessageId = () => `beratung-${++messageIdCounter}-${Date.now()}`;

export function ElterngeldBeratung({ onSendMessage, aiMessages, isAiLoading, onBack }: ElterngeldBeratungProps) {
  const [messages, setMessages] = useState<BeratungMessage[]>([]);
  const [currentStep, setCurrentStep] = useState("intro");
  const [messageIndex, setMessageIndex] = useState(0);
  const [data, setData] = useState<BeratungData>({});
  const [isTyping, setIsTyping] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState<FlowMessage | null>(null);
  const [mode, setMode] = useState<"guided" | "question" | "freeChat">("guided");
  const [questionInput, setQuestionInput] = useState("");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Process AI messages into our chat
  useEffect(() => {
    if (mode === "question" && aiMessages.length > 0) {
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      if (lastAiMessage.role === "assistant" && lastAiMessage.content) {
        // Add AI response to our messages
        setMessages((prev) => {
          // Check if we already have this message
          const lastOurs = prev[prev.length - 1];
          if (lastOurs?.role === "assistant" && lastOurs.content === "") {
            // Update the placeholder
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: lastAiMessage.content } : m
            );
          }
          return prev;
        });
      }
    }
  }, [aiMessages, mode]);

  // Process guided flow
  useEffect(() => {
    if (mode !== "guided" || !currentStep || waitingForInput) return;

    const step = BERATUNG_FLOW[currentStep];
    if (!step || messageIndex >= step.messages.length) return;

    const message = step.messages[messageIndex];
    setIsTyping(true);

    const delay = message.type === "text" ? 600 + (message.content?.length || 0) * 8 : 400;

    const timer = setTimeout(() => {
      setIsTyping(false);

      if (message.type === "question") {
        setMessages((prev) => [...prev, { id: generateMessageId(), role: "assistant", content: message.content || "" }]);
        setWaitingForInput(message);
      } else if (message.type === "calculation") {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: "assistant",
            content: "",
            component: <CalculationDisplay data={data} type={message.calculationType || ""} />,
          },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else if (message.type === "card") {
        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: "assistant", content: "", component: <ElterngeldArtenCard /> },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else if (message.type === "timeline") {
        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: "assistant", content: "", component: <TimelineVorschlag data={data} /> },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else if (message.type === "optimization") {
        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: "assistant", content: "", component: <OptimizationCheck data={data} /> },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else if (message.type === "summary") {
        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: "assistant", content: "", component: <SummaryCard data={data} /> },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else if (message.type === "checklist") {
        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: "assistant", content: "", component: <ChecklistCard data={data} /> },
        ]);
        setMessageIndex((prev) => prev + 1);
      } else {
        setMessages((prev) => [...prev, { id: generateMessageId(), role: "assistant", content: message.content || "" }]);
        setMessageIndex((prev) => prev + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, messageIndex, waitingForInput, mode, data]);

  // Check step completion
  useEffect(() => {
    if (mode !== "guided" || !currentStep || waitingForInput || isTyping) return;

    const step = BERATUNG_FLOW[currentStep];
    if (!step || messageIndex < step.messages.length) return;

    if (step.next) {
      const timer = setTimeout(() => {
        const nextStep = typeof step.next === "function" ? step.next(data) : step.next;
        if (nextStep === "frei") {
          setMode("freeChat");
        } else if (nextStep) {
          setCurrentStep(nextStep);
          setMessageIndex(0);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [messageIndex, currentStep, waitingForInput, isTyping, data, mode]);

  const handleGuidedInput = (value: string | number) => {
    if (!waitingForInput || !waitingForInput.field) return;

    const displayValue =
      waitingForInput.options?.find((o) => o.value === String(value))?.label ||
      (waitingForInput.inputType === "date"
        ? new Date(String(value)).toLocaleDateString("de-DE")
        : `${value}${waitingForInput.unit || ""}`);

    setMessages((prev) => [...prev, { id: generateMessageId(), role: "user", content: displayValue }]);
    setData((prev) => ({ ...prev, [waitingForInput.field!]: value }));
    setWaitingForInput(null);
    setMessageIndex((prev) => prev + 1);
  };

  const askQuestion = async () => {
    const question = questionInput.trim();
    if (!question) return;

    // Add user question to messages
    setMessages((prev) => [...prev, { id: generateMessageId(), role: "user", content: question }]);
    // Add placeholder for AI response
    setMessages((prev) => [...prev, { id: generateMessageId(), role: "assistant", content: "" }]);
    setQuestionInput("");

    // Send to AI via parent's function
    await onSendMessage(question);
  };

  const continueGuided = () => {
    setMode("guided");
  };

  const switchToQuestion = () => {
    setMode("question");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Progress
  const allSteps = Object.keys(BERATUNG_FLOW);
  const currentIndex = allSteps.indexOf(currentStep);
  const progress = mode === "freeChat" ? 100 : Math.round((currentIndex / (allSteps.length - 1)) * 100);

  const renderInput = () => {
    // Question mode or free chat: text input
    if (mode === "question" || mode === "freeChat") {
      return (
        <div className="space-y-2">
          <div className="flex items-end gap-2 rounded-2xl px-4 py-2 border border-border bg-white">
            <textarea
              ref={inputRef}
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              placeholder={mode === "freeChat" ? "Frag mich alles zum Elterngeld..." : "Deine Frage..."}
              rows={1}
              className="flex-1 w-full border-0 bg-transparent focus:outline-none focus:ring-0 text-sm resize-none min-h-[24px] max-h-[120px] py-0.5"
            />
            <Button
              size="icon"
              onClick={askQuestion}
              disabled={isAiLoading || !questionInput.trim()}
              className="rounded-full h-8 w-8 shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          {mode === "question" && (
            <Button variant="ghost" size="sm" onClick={continueGuided} className="w-full text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Beratung
            </Button>
          )}
        </div>
      );
    }

    // Guided mode with active input
    if (waitingForInput) {
      if (waitingForInput.inputType === "buttons" && waitingForInput.options) {
        return (
          <div className="space-y-2">
            {waitingForInput.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGuidedInput(opt.value)}
                className="w-full py-3 px-4 bg-white border-2 border-border rounded-xl text-left font-medium hover:border-primary hover:bg-primary/5 transition-all text-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      if (waitingForInput.inputType === "date") {
        return (
          <input
            type="date"
            onChange={(e) => e.target.value && handleGuidedInput(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:border-primary text-base"
          />
        );
      }

      if (waitingForInput.inputType === "slider") {
        return (
          <SliderInput
            min={waitingForInput.min || 0}
            max={waitingForInput.max || 8000}
            step={waitingForInput.step || 100}
            unit={waitingForInput.unit || "€"}
            hint={waitingForInput.hint}
            onSubmit={handleGuidedInput}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <p className="font-semibold text-foreground text-sm">Elterngeld-Beratung</p>
            <p className="text-xs text-muted-foreground">
              {mode === "freeChat" ? "Freier Chat" : mode === "question" ? "Frage-Modus" : "Geführte Beratung"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "guided" && !waitingForInput?.inputType?.includes("slider") && (
            <Button variant="outline" size="sm" onClick={switchToQuestion} className="h-8 text-xs">
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Frage stellen
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMessages([]);
              setCurrentStep("intro");
              setMessageIndex(0);
              setData({});
              setMode("guided");
              setWaitingForInput(null);
            }}
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-4 py-3" ref={scrollAreaRef}>
        <div className="flex flex-col">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.content && <MessageBubble content={msg.content} isUser={msg.role === "user"} />}
              {msg.component}
            </div>
          ))}
          {(isTyping || isAiLoading) && (
            <div className="flex justify-start mb-3">
              <div className="bg-transparent px-4 py-2.5">
                <ThinkingAnimation />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">{renderInput()}</div>
    </div>
  );
}
