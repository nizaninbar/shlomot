import EmptyState from '../components/EmptyState'
import Mandala from '../components/Mandala'
import { t } from '../strings'

export default function Home() {
  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.home.title}</h1>
      <EmptyState title={t.home.emptyTitle} text={t.home.emptyText} />
    </>
  )
}
