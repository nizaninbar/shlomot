import { Link } from 'react-router-dom'
import { t } from '../strings'

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="header__brand">
        <img className="header__logo" src={`${import.meta.env.BASE_URL}icons/logo-200.png`} alt="" width={48} height={48} />
        <span className="header__title">{t.appName}</span>
      </Link>
      <Link to="/equipment" className="header__link">
        {t.equipment.link}
      </Link>
      <Link to="/settings" className="header__link header__link--next">
        {t.settings.link}
      </Link>
    </header>
  )
}
