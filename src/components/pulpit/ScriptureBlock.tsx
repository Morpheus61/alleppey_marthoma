interface Props {
  reference?: string | null
  text?: string | null
  textMl?: string | null
}

export default function ScriptureBlock({ reference, text, textMl }: Props) {
  if (!reference && !text && !textMl) return null

  return (
    <div className="border-l-[3px] border-brand-900 rounded-r-lg bg-amber-50/60 px-4 py-3 my-3">
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">✝ Scripture</p>
      {textMl && (
        <p
          className="font-malayalam text-[14px] leading-[1.9] text-brand-900 mb-2"
          lang="ml"
          dir="auto"
        >
          {textMl}
        </p>
      )}
      {text && (
        <p className="text-[13px] italic leading-relaxed text-gray-700">{text}</p>
      )}
      {reference && (
        <p className="text-[11px] font-semibold text-amber-700 mt-2">— {reference}</p>
      )}
    </div>
  )
}
