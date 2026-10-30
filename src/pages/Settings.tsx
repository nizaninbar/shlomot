import Mandala from '../components/Mandala'
import SyncSection from '../components/SyncSection'
import { t } from '../strings'

export default function Settings() {
  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.settings.title}</h1>
      <SyncSection />
    </>
  )
}
