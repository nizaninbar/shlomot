import Mandala from './Mandala'
import ConnectForm from './ConnectForm'
import { t } from '../strings'

/** Blocks the app until this device has a Turso URL + token. */
export default function SetupScreen() {
  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.connection.setupTitle}</h1>
      <section className="card card--static">
        <p className="card__desc">{t.connection.setupText}</p>
        <ConnectForm />
      </section>
    </>
  )
}
