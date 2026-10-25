type Props = { title: string; text?: string }

export default function EmptyState({ title, text }: Props) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      {text && <p className="empty__text">{text}</p>}
    </div>
  )
}
