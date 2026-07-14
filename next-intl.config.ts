import createNextIntlPlugin from 'next-intl/plugin'

// This file is required by next-intl alongside next.config.js
// The plugin is applied via withNextIntl() wrapper — see next.config.js
export default createNextIntlPlugin('./src/i18n.ts')
