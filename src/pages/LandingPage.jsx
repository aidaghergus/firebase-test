import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { translations, LANGUAGES, RTL_LANGS } from '../i18n/landing.js'

export default function LandingPage() {
  const { user } = useAuth()
  const { lang, setLang } = useLanguage()
  const [activeSection, setActiveSection] = useState('')
  const t = translations[lang]
  const isRtl = RTL_LANGS.includes(lang)

  useEffect(() => {
    const ids = ['practice-areas', 'about', 'publications']
    const observers = ids.map((id) => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { threshold: 0.3 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach((obs) => obs?.disconnect())
  }, [])

  return (
    <div className="bg-surface text-on-surface font-body scroll-smooth" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#fcf9f8]/70 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-12 py-6 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="https://i.imgur.com/5Sgvd5n.png" alt="Pericles" className="h-8 sm:h-12" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
            <span className="text-lg sm:text-2xl font-bold text-primary leading-tight">Pericles</span>
          </div>
          <div className="hidden md:flex items-center space-x-10 font-serif font-medium tracking-tight">
            {[
              { label: t.nav.resources,     href: '#about',          section: 'about' },
              { label: t.nav.practiceAreas, href: '#practice-areas', section: 'practice-areas' },
              { label: t.nav.publications,  href: '#publications',   section: 'publications' },
            ].map(({ label, href, section }) => (
              <a
                key={label}
                href={href}
                className={
                  activeSection === section
                    ? 'text-[#002349] border-b border-[#735a3a] pb-1 transition-colors duration-300'
                    : 'text-slate-600 hover:text-[#735a3a] transition-colors duration-300'
                }
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block relative">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="appearance-none text-xs font-medium uppercase tracking-widest text-primary border border-primary/30 rounded-md pl-3 pr-6 py-1.5 bg-white focus:outline-none cursor-pointer hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-primary">expand_more</span>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary border border-primary/30 px-4 py-1.5 rounded-md hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300"
            >
              {t.auth.enterPortal}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 pt-32 pb-20">
          <div className="max-w-4xl text-center">
            <span className="inline-block font-label text-secondary uppercase tracking-[0.3em] text-[10px] mb-8">
              {t.hero.tagline}
            </span>
            <h1 className="font-headline text-7xl md:text-8xl lg:text-9xl font-extralight text-primary leading-[0.95] tracking-tighter mb-12">
              {t.hero.headline[0]} <br /><span className="italic">{t.hero.headline[1]}</span>
            </h1>
            <div className="h-24 w-px bg-outline-variant/30 mx-auto mb-12" />
            <p className="font-headline text-2xl md:text-3xl text-on-surface-variant font-light max-w-2xl mx-auto leading-relaxed italic">
              {t.hero.quote}
            </p>
            <div className="mt-16">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-10 py-4 rounded-md font-medium hover:bg-primary-dim transition-all active:scale-95 text-sm tracking-wide"
              >
                {t.hero.cta}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured */}
        <section id="about" className="bg-surface-container-low py-32 px-12">
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-start">
            <div className="md:col-span-4">
              <h2 className="font-headline text-4xl text-primary mb-6">{t.featured.heading}</h2>
              <p className="text-on-surface-variant leading-loose mb-8">
                {t.featured.body}
              </p>
              <a className="text-secondary font-medium border-b border-secondary/30 pb-1 hover:border-secondary transition-all" href="#">
                {t.featured.link}
              </a>
            </div>
            <div className="md:col-span-8 relative">
              <img
                alt="Minimalist architectural detail of a modern courthouse"
                className="w-full aspect-video object-cover rounded-sm grayscale contrast-125"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi4HrmVaIVikNaRe_7QIQimAu52dcXOVZAxcTL5fEFQb04RH9QMgAUZiMDSjEyfL9pEqzFfwFrW1uR4WNMpG3mh8YQitJF3xEHjWoEfjp73sDuSyEnPkZuP3bDOBRm9U0T6Efg7SvaitcvFkPIGz15p1zzKZMtoe2o-9uUtRdY5TAcGL4L_adGFivVWwm_cmWxMCKgD4F2NEO427yyAg6eH7vvjxm7qJ0IFTjEgtWdWuyDvnJ3I08C6bfrZG-d33yEeEDm_bw-1so"
              />
              <div className="absolute -bottom-8 -left-8 bg-surface p-10 shadow-xl max-w-sm hidden lg:block">
                <p className="font-headline italic text-lg leading-relaxed text-primary">
                  {t.featured.pullquote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Agents */}
        <section id="practice-areas" className="py-24 px-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-5xl font-bold text-primary mb-4">{t.agents.heading}</h2>
              <p className="text-xl text-on-surface-variant">{t.agents.subheading}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: 'Kai Goldman',   specialty: 'Tourism & Investment',  img: 'https://i.imgur.com/rzPl9Wj.png',  initials: 'KG' },
                { name: 'Mai Morgan',   specialty: 'Labor Law',              img: 'https://i.imgur.com/VkBJZXG.png',  initials: 'MM' },
                { name: 'Isai Roth',    specialty: 'Family Reunification',   img: 'https://i.imgur.com/WHO7U8I.png',  initials: 'IR' },
                { name: 'Nai Black',    specialty: 'Civil Law',              img: 'https://i.imgur.com/g0DXobO.png',  initials: 'NB' },
                { name: 'Aitana Sola',  specialty: 'Immigration Law',        img: 'https://i.imgur.com/QObI73i.png',  initials: 'AS' },
                { name: 'Zarai Weiss',  specialty: 'Commercial Law',         img: 'https://i.imgur.com/RMh5FfF.png',  initials: 'ZW' },
                { name: 'Lilai Klein',  specialty: 'Criminal Law',           img: 'https://i.imgur.com/fR8Oapv.png',  initials: 'LK' },
                { name: 'Nicolai Baron',specialty: 'Intellectual Property',  img: 'https://i.imgur.com/9xXSfQu.png',  initials: 'NB' },
                { name: 'Aitor Grant',  specialty: 'Tax Law',                img: 'https://i.imgur.com/0mHRqDQ.png',  initials: 'AG' },
                { name: 'Madia Sachs',  specialty: 'Real Estate Law',        img: 'https://i.imgur.com/rC8MNCi.png',  initials: 'MS' },
                { name: 'Ainara Bloom', specialty: 'Family Law',             img: 'https://i.imgur.com/0oLuSOC.png',  initials: 'AB' },
                { name: 'Unai Reed',    specialty: 'Students',               img: 'https://i.imgur.com/SIhmjAN.png',  initials: 'UR' },
                { name: 'Aiza Cole',    specialty: 'Entrepreneurs',          img: 'https://i.imgur.com/KpjHBol.png',  initials: 'AC' },
                { name: 'Ainoa Ford',   specialty: 'Digital Nomads',         img: 'https://i.imgur.com/FgI7re1.png',  initials: 'AF' },
                { name: 'Aimar Wolf',   specialty: 'Administrative Law',     img: 'https://i.imgur.com/oxvCGd6.png',  initials: 'AW' },
              ].map((agent) => (
                <div key={agent.name} className="bg-white rounded-3xl p-8 shadow-xl">
                  <div className="flex items-start gap-6 mb-6">
                    <img
                      src={agent.img}
                      alt={agent.name}
                      className="w-24 h-24 rounded-full object-cover shadow-lg flex-shrink-0"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                    <div className="w-24 h-24 bg-primary text-on-primary rounded-full hidden items-center justify-center text-3xl font-bold flex-shrink-0">
                      {agent.initials}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-2xl font-bold text-primary mb-2">{agent.name}</h3>
                      <p className="text-on-surface-variant text-lg font-medium">{agent.specialty}</p>
                    </div>
                  </div>
                  <Link
                    to={user ? '/app' : '/login'}
                    className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors active:scale-95"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t.agents.chatWith.replace('{name}', agent.name)}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Briefings */}
        <section id="publications" className="bg-surface-container-low py-40 px-12">
          <div className="max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
              <div className="lg:col-span-4">
                <h3 className="font-headline text-5xl text-primary mb-8">{t.briefings.heading}</h3>
                <p className="text-on-surface-variant mb-12 leading-relaxed">
                  {t.briefings.body}
                </p>
                <button className="font-label text-xs uppercase tracking-[0.2em] border border-primary/20 px-8 py-4 hover:bg-primary hover:text-on-primary transition-all duration-500">
                  {t.briefings.viewAll}
                </button>
              </div>
              <div className="lg:col-span-8 flex flex-col gap-16">
                {[
                  {
                    date: 'November 14, 2024',
                    title: 'The Algorithmic Precedent: Predicting Judicial Outcomes in Maritime Law',
                    desc: 'How deep-learning models are identifying latent patterns in admiralty court rulings across the Mediterranean basin.',
                    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdRiFdbOkxIBWii0Zl-eZCpLv66egFjslH6HODNLv_8wTVJvvmH61GomWwwWtGbEEC4fqrVj_HRF5EM8TbYw7JmFBcwWyEKQ3nyF3hDUuD7y2q8xSby5Vy4Cdmw9vuVWDA7fI-DAO3ioGWQtlyVn5hbC6QjvgBIiLyIC_hwONXYTQc2MKdpgCV_1VpgwmTtbvzSRy80FCPCQrExiguqZpp1UXgMcaCzopl04Og6se-gQtSUbyhTuUHBnZkAuK6KLgBahghDFEHuvU',
                  },
                  {
                    date: 'October 29, 2024',
                    title: 'Sovereignty in the Cloud: Data Jurisdiction in Non-Physical Territories',
                    desc: 'Re-evaluating the Westphalian concept of borders in an age of distributed ledger technology and decentralized storage.',
                    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAtgxWbJVTIfJYtJdx_xMLjEiHPp1trdVltfuZkv-K7Wkv01PrxoNL1DJk6cnCyd0WihmQmdFjHYCwC_DBxbOYaAu1STms_sFx-wFGOsXMKnQ2LQhdPaydRkhuQpdPRdZY9Qo9EubwyKSkz1IQ0HVuKHXXs5-TPuLt3qkS-J1hOHdicxZUH4jmAReWwG31f25jaake_w2sv_TJ3ejflQXTiATVQJvf-RKJ0t4kMYXfzd0fQOdcWmkAWaYumzpOsShbz3q_eKIHLF8',
                  },
                ].map((brief) => (
                  <div key={brief.date} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center group cursor-pointer">
                    <div className="md:col-span-4 overflow-hidden">
                      <img alt={brief.title} className="w-full aspect-[4/3] object-cover grayscale group-hover:scale-105 transition-transform duration-700" src={brief.img} />
                    </div>
                    <div className="md:col-span-8">
                      <span className="font-label text-[10px] text-secondary tracking-widest uppercase mb-2 block">{brief.date}</span>
                      <h5 className="font-headline text-3xl text-primary mb-4 leading-snug group-hover:text-secondary transition-colors">{brief.title}</h5>
                      <p className="text-sm text-on-surface-variant line-clamp-2">{brief.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-40 px-12 text-center bg-primary text-on-primary">
          <div className="max-w-2xl mx-auto">
            <h3 className="font-headline text-5xl mb-8 font-extralight italic">{t.cta.heading}</h3>
            <p className="font-body text-primary-fixed/60 mb-12 leading-loose text-sm uppercase tracking-widest">
              {t.cta.body}
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <input
                className="bg-primary-container/20 border border-primary-fixed/20 text-on-primary placeholder:text-on-primary/40 px-8 py-4 focus:outline-none focus:border-secondary transition-all min-w-[300px] rounded-md"
                placeholder={t.cta.placeholder}
                type="email"
              />
              <Link
                to="/login"
                className="bg-secondary text-on-secondary px-10 py-4 font-bold text-xs uppercase tracking-widest hover:bg-secondary-container hover:text-on-secondary-container transition-all rounded-md"
              >
                {t.cta.submit}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/15 bg-[#f6f3f2]">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 gap-8">
          <div className="font-serif text-lg text-[#735a3a]">{t.footer.brand}</div>
          <div className="flex flex-wrap justify-center gap-10 font-sans text-xs uppercase tracking-widest text-slate-500">
            <a className="hover:underline decoration-[#735a3a] transition-all" href="#">{t.footer.disclosures}</a>
            <a className="hover:underline decoration-[#735a3a] transition-all" href="#">{t.footer.privacy}</a>
            <a className="hover:underline decoration-[#735a3a] transition-all" href="#">{t.footer.terms}</a>
            <a className="hover:underline decoration-[#735a3a] transition-all" href="#">{t.footer.contact}</a>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 text-center md:text-right">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}