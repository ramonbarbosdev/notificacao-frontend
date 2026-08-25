export const SITE_PAGE_STYLES = [
  `
    .site-page {
      max-width: 72rem;
      margin: 0 auto;
      padding: 3rem 1rem 4rem;
    }

    .site-hero {
      padding: 4rem 0 3rem;
    }

    .site-eyebrow {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-primary-soft);
      margin-bottom: 1rem;
    }

    .site-title {
      font-size: clamp(2rem, 5vw, 3.25rem);
      line-height: 1.1;
      font-weight: 700;
      margin: 0 0 1rem;
      color: var(--color-text);
    }

    .site-lead {
      font-size: 1.125rem;
      line-height: 1.7;
      color: var(--color-text-muted);
      max-width: 42rem;
      margin: 0;
    }

    .site-section-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
    }

    .site-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }

    .site-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      padding: 1.25rem;
    }

    .site-card h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .site-card p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--color-text-muted);
    }

    .site-list {
      margin: 1rem 0 0;
      padding-left: 1.25rem;
      color: var(--color-text-muted);
      line-height: 1.7;
    }

    .site-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 2rem;
    }
  `,
];
