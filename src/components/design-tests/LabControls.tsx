'use client';
import { ArrowUpRight, ChevronDown, Search, Users, X } from 'lucide-react';
import { useDesignLab } from './DesignLabShell';
import { SportMark } from './LabPrimitives';
import { SPORTS } from './lab-data';

export function LabHeading({ title, eyebrow = 'ASYV CHAMPIONS LEAGUE', note }: { title: string; eyebrow?: string; note?: string }) {
  const { preview, setPreview, isLab } = useDesignLab();
  return <div className="ml-section-heading"><div><p className="ml-eyebrow">{eyebrow}</p><h1>{title}<span>.</span></h1></div><div className="ml-board-controls">{isLab && <button className="ml-preview-switch" role="switch" aria-checked={preview} onClick={() => setPreview(!preview)}><span>Preview data</span><i><span /></i></button>}<span className="ml-live-indicator"><i />{preview ? 'Sample data for design review' : note || (isLab ? 'Actual league data' : 'Current championship')}</span></div></div>;
}
export function SportTabs() {
  const { sport, setSport } = useDesignLab();
  return <div className="ml-sport-tabs" role="group" aria-label="Choose sport">{SPORTS.map(s => <button key={s.id} aria-pressed={sport === s.id} onClick={() => setSport(s.id)} className={sport === s.id ? 'ml-sport-active' : ''}><span className="ml-sport-number">{s.number}</span><SportMark sport={s.id} size={25} /><span>{s.label}</span><ArrowUpRight size={20} /></button>)}</div>;
}
export function GenderFilter({ value, onChange, all = true }: { value: string; onChange: (value: string) => void; all?: boolean }) {
  return <label className="ml-gender"><Users size={16} /><select aria-label="Filter by gender" value={value} onChange={e => onChange(e.target.value)}>{all && <option value="all">Everyone</option>}<option value="male">Boys</option><option value="female">Girls</option></select><ChevronDown size={14} /></label>;
}
export function SearchField({ value, onChange, placeholder = 'Find your family' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="ml-search"><Search size={17} /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />{value && <button aria-label="Clear search" onClick={() => onChange('')}><X size={15} /></button>}</label>;
}
export function PreviewNote({ children }: { children: React.ReactNode }) {
  return <p className="ml-preview-note"><span>PREVIEW</span>{children}</p>;
}
