import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useI18n } from '../i18n';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo size={28} />
          <p className="text-small text-muted" style={{ margin: '12px 0 0', maxWidth: 300 }}>
            {t('footer_tagline')}
          </p>
        </div>
        <div>
          <div className="footer-heading">{t('footer_platform')}</div>
          <Link to="/report">{t('footer_report')}</Link>
          <Link to="/community">{t('footer_community')}</Link>
          <Link to="/my-reports">{t('footer_my_reports')}</Link>
          <Link to="/dashboard">{t('footer_dashboard')}</Link>
        </div>
        <div>
          <div className="footer-heading">{t('footer_access')}</div>
          <Link to="/login">{t('footer_login')}</Link>
          <Link to="/signup">{t('footer_signup')}</Link>
          <Link to="/authority">{t('footer_authority')}</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} RoadPulse {t('footer_copy')}</span>
        <span>{t('footer_open')}</span>
      </div>
    </footer>
  );
}
