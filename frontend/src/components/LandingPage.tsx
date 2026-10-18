import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, LazyMotion, domAnimation, m as motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowDown, ArrowRight, BookOpenText, Check, FileText, GraduationCap, Languages, Menu, MessageCircleQuestion, MessageSquareText, Microscope, Moon, PanelTop, Plus, ShieldCheck, Sparkles, Sun, Target, X } from 'lucide-react'
import BrandSymbol from './BrandSymbol'
import { FadeUp, FloatingCard, StaggerContainer, StaggerItem } from './animations'

function BrandLockup() {
  const reducedMotion = useReducedMotion()
  return <motion.span className="landing-brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.55, ease: 'easeOut' }}><span className="landing-brand-mark"><BrandSymbol /></span><span>Docu<span>Sathi</span> AI</span></motion.span>
}

function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const changeLanguage = (language: 'en' | 'ne') => {
    localStorage.setItem('docintel_language', language)
    void i18n.changeLanguage(language)
  }
  return <div className="landing-language" aria-label={t('language')}>
    <button className={i18n.language === 'en' ? 'active' : ''} aria-pressed={i18n.language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
    <span aria-hidden="true">|</span>
    <button className={i18n.language === 'ne' ? 'active' : ''} aria-pressed={i18n.language === 'ne'} onClick={() => changeLanguage('ne')}>ने</button>
  </div>
}

export function Navbar({ darkMode, onToggleTheme }: { darkMode: boolean; onToggleTheme: () => void }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', value => setScrolled(value > 8))
  const links = [
    ['#features', t('landingFeatures')],
    ['#how-it-works', t('landingHowItWorks')],
    ['#faq', t('landingFaq')],
    ['#support', t('landingSupport')],
  ]
  return <motion.header className={`landing-nav ${scrolled ? 'scrolled' : ''}`} initial={{ opacity: 0, y: reducedMotion ? 0 : -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <div className="landing-nav-inner">
      <a className="landing-home" href="#top" aria-label="DocuSathi AI home"><BrandLockup /></a>
      <nav className={`landing-links ${menuOpen ? 'open' : ''}`} aria-label={t('mainNavigation')}>
        {links.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <div className="landing-mobile-actions"><LanguageSwitch /><button className="landing-theme-toggle" type="button" aria-label={t(darkMode ? 'landingLightMode' : 'landingDarkMode')} title={t(darkMode ? 'landingLightMode' : 'landingDarkMode')} onClick={onToggleTheme}>{darkMode ? <Sun size={16}/> : <Moon size={16}/>}</button><Link className="landing-login" to="/login" onClick={() => setMenuOpen(false)}>{t('landingLogin')}</Link><Link className="landing-button small" to="/signup" onClick={() => setMenuOpen(false)}>{t('landingGetStarted')}<ArrowRight size={15}/></Link></div>
      </nav>
      <div className="landing-nav-actions"><LanguageSwitch /><button className="landing-theme-toggle" type="button" aria-label={t(darkMode ? 'landingLightMode' : 'landingDarkMode')} title={t(darkMode ? 'landingLightMode' : 'landingDarkMode')} onClick={onToggleTheme}>{darkMode ? <Sun size={16}/> : <Moon size={16}/>}</button><Link className="landing-login" to="/login">{t('landingLogin')}</Link><Link className="landing-button small" to="/signup">{t('landingGetStarted')}<ArrowRight size={15}/></Link></div>
      <button className="landing-menu-toggle" aria-label={menuOpen ? t('landingCloseMenu') : t('landingOpenMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
    </div>
  </motion.header>
}

export function Hero() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const headline = t('landingHeadline').split(/(\s+)/u).filter(Boolean)
  return <section className="landing-hero" id="top">
    <motion.div className="landing-hero-pill" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: 0.12 }}><Sparkles size={14}/>{t('landingPill')}</motion.div>
    <h1 aria-label={t('landingHeadline')}>{headline.map((word, index) => <motion.span className="landing-headline-word" key={`${word}-${index}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 16, filter: reducedMotion ? 'blur(0px)' : 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: reducedMotion ? 0 : 0.58, ease: 'easeOut', delay: reducedMotion ? 0 : 0.18 + index * 0.075 }}>{word}</motion.span>)}</h1>
    <motion.p initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut', delay: reducedMotion ? 0 : 0.72 }}>{t('landingSubtitle')}</motion.p>
    <motion.div className="landing-hero-actions" initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut', delay: reducedMotion ? 0 : 0.85 }}>
      <motion.div whileHover={reducedMotion ? undefined : { scale: 1.035 }} whileTap={reducedMotion ? undefined : { scale: 0.97 }}><Link className="landing-button" to="/signup">{t('landingStartFree')}<ArrowRight size={17}/></Link></motion.div>
      <motion.div whileHover={reducedMotion ? undefined : { scale: 1.035 }} whileTap={reducedMotion ? undefined : { scale: 0.97 }}><a className="landing-button outline" href="#how-it-works">{t('landingSeeHow')}<ArrowDown size={16}/></a></motion.div>
    </motion.div>
    <HeroVisual />
  </section>
}

export function HeroVisual() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const visualRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(visualRef, { amount: 0.12 })
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const translateX = useTransform(pointerX, value => value * 0.28)
  const translateY = useTransform(pointerY, value => value * 0.25)
  const citeX = useTransform(pointerX, value => value * -0.2)
  const citeY = useTransform(pointerY, value => value * 0.18)
  const secureX = useTransform(pointerX, value => value * 0.24)
  const secureY = useTransform(pointerY, value => value * -0.22)
  const englishAnswer = t('landingMockAnswer', { lng: 'en' })
  const nepaliAnswer = t('landingMockAnswer', { lng: 'ne' })
  const questionCharacters = Array.from(t('landingMockQuestion'))
  const answerCharacters = Array.from(englishAnswer)
  const [questionText, setQuestionText] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [phase, setPhase] = useState<'question' | 'thinking' | 'answer' | 'citations'>('question')
  const [translated, setTranslated] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setQuestionText(questionCharacters.join(''))
      setAnswerText(answerCharacters.join(''))
      setPhase('citations')
      return
    }
    if (!isInView) return
    let timeout = 0
    let cancelled = false
    const typeQuestion = (index: number) => {
      if (cancelled) return
      setPhase('question')
      setQuestionText(questionCharacters.slice(0, index).join(''))
      if (index < questionCharacters.length) {
        timeout = window.setTimeout(() => typeQuestion(index + 1), 34)
      } else {
        setPhase('thinking')
        timeout = window.setTimeout(() => typeAnswer(0), 950)
      }
    }
    const typeAnswer = (index: number) => {
      if (cancelled) return
      setPhase('answer')
      setAnswerText(answerCharacters.slice(0, index).join(''))
      if (index < answerCharacters.length) {
        timeout = window.setTimeout(() => typeAnswer(index + 1), 22)
      } else {
        setPhase('citations')
        timeout = window.setTimeout(() => {
          setQuestionText('')
          setAnswerText('')
          typeQuestion(1)
        }, 2800)
      }
    }
    typeQuestion(1)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [answerCharacters.join(''), isInView, questionCharacters.join(''), reducedMotion])

  const moveWithPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !visualRef.current) return
    const bounds = visualRef.current.getBoundingClientRect()
    pointerX.set((event.clientX - bounds.left - bounds.width / 2) / bounds.width * 14)
    pointerY.set((event.clientY - bounds.top - bounds.height / 2) / bounds.height * 10)
  }
  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return <div className="landing-visual-wrap" role="group" aria-label={t('landingProductPreview')}>
    <motion.div className="landing-visual" ref={visualRef} onPointerMove={moveWithPointer} onPointerLeave={resetPointer}>
      <motion.div className="landing-visual-glow" animate={isInView && !reducedMotion ? { x: [0, 28, -18, 0], scaleX: [1, 1.14, 0.92, 1], scaleY: [1, 0.94, 1.08, 1] } : { x: 0, scaleX: 1, scaleY: 1 }} transition={{ duration: 14, repeat: isInView && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }}/>
      <motion.div className="landing-parallax-shell" style={{ x: translateX, y: translateY }}><FloatingCard className="landing-floating-card translate-float" delay={0} duration={4.8} distance={8}><span className="float-icon"><Languages size={17}/></span><span><strong>{t('landingTranslate')}</strong><small>{t('landingNepali')}</small></span><span className="mock-toggle"><i/></span></FloatingCard></motion.div>
      <motion.div className="landing-parallax-shell" style={{ x: citeX, y: citeY }}><FloatingCard className="landing-floating-card cite-float" delay={1.1} duration={5.7} distance={11}><span className="float-check"><Check size={15}/></span><span><strong>{t('landingCited')}</strong><small>{t('landingPageFour')}</small></span></FloatingCard></motion.div>
      <motion.div className="landing-parallax-shell" style={{ x: secureX, y: secureY }}><FloatingCard className="landing-floating-card secure-float" delay={2.2} duration={6.2} distance={7}><span className="float-shield"><ShieldCheck size={17}/></span><span><strong>{t('landingPrivate')}</strong><small>{t('landingYourDocsStayYours')}</small></span></FloatingCard></motion.div>
      <FloatingCard className="mock-chat" delay={0.7} duration={6.5} distance={5} pauseOnHover pauseOnScroll>
        <div className="mock-chat-top"><span className="mock-file-icon"><FileText size={16}/></span><span><strong>{t('landingStudyNotes')}</strong><small>{t('landingReadyToAsk')}</small></span><span className="mock-online"/></div>
        <div className="mock-chat-body">
          <div className="mock-question"><span className="mock-you">{t('landingYou')}</span><p>{questionText}<span className="typing-caret" aria-hidden="true"/></p></div>
          <div className="mock-answer"><span className="mock-answer-label"><Sparkles size={13}/>{t('landingAnswer')}</span>
            {phase === 'thinking' ? <div className="mock-thinking" role="status" aria-label={t('landingThinking')}><motion.i animate={reducedMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: reducedMotion ? 0 : Infinity, delay: 0 }}/><motion.i animate={reducedMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: reducedMotion ? 0 : Infinity, delay: 0.18 }}/><motion.i animate={reducedMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: reducedMotion ? 0 : Infinity, delay: 0.36 }}/></div> : <AnimatePresence mode="wait" initial={false}><motion.p key={translated ? 'ne' : 'en'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>{translated ? nepaliAnswer : answerText}</motion.p></AnimatePresence>}
            <div className="mock-answer-footer"><button className="mock-translate-button" type="button" onClick={() => setTranslated(value => !value)}><Languages size={12}/>{translated ? t('landingShowEnglish') : t('landingTranslate')}</button>
              <div className="mock-citations-slot"><AnimatePresence>{phase === 'citations'&&<motion.div className="mock-citations" initial={{ opacity: 0, scale: 0.8, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ type: 'spring', stiffness: 440, damping: 23 }}><span><FileText size={12}/>{t('landingSourceChip')}</span><span><FileText size={12}/>{t('landingPageChip')}</span></motion.div>}</AnimatePresence></div>
            </div>
          </div>
        </div>
        <div className="mock-composer"><span>{t('landingAskPlaceholder')}</span><span className="mock-send"><ArrowRight size={14}/></span></div>
      </FloatingCard>
      <motion.span className="visual-sparkle sparkle-one" animate={isInView && !reducedMotion ? { y: [0, -5, 0], opacity: [0.65, 1, 0.65] } : undefined} transition={{ duration: 3.5, repeat: isInView && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }}><Sparkles size={20}/></motion.span><motion.span className="visual-sparkle sparkle-two" animate={isInView && !reducedMotion ? { y: [0, 4, 0], opacity: [0.6, 1, 0.6] } : undefined} transition={{ duration: 4.3, repeat: isInView && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }}><Sparkles size={14}/></motion.span>
    </motion.div>
  </div>
}

function TrustedBy() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(trackRef, { amount: 0.2 })
  const badges = ['BCA','BBA',t('landingEngineering'),t('landingResearch'),t('landingSchool')]
  return <FadeUp className="landing-trusted"><span>{t('landingBuiltFor')}</span><div className="landing-marquee" ref={trackRef} role="group" aria-label={t('landingBuiltFor')}><motion.div className="landing-marquee-track" animate={isInView && !reducedMotion ? { x: ['0%', '-50%'] } : { x: '0%' }} transition={{ duration: 20, ease: 'linear', repeat: isInView && !reducedMotion ? Infinity : 0 }}><span className="landing-marquee-group">{badges.map(item=><strong key={item}>{item}</strong>)}</span>{!reducedMotion&&<span className="landing-marquee-group" aria-hidden="true">{badges.map((item,index)=><strong key={`${item}-${index}`}>{item}</strong>)}</span>}</motion.div></div></FadeUp>
}

export function Steps() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 80%', 'end 45%'] })
  const reducedMotion = useReducedMotion()
  const steps = [
    { icon: FileText, number: '01', title: t('landingStepUpload'), text: t('landingStepUploadText') },
    { icon: MessageSquareText, number: '02', title: t('landingStepAsk'), text: t('landingStepAskText') },
    { icon: Target, number: '03', title: t('landingStepAnswer'), text: t('landingStepAnswerText') },
  ]
  return <motion.section ref={sectionRef} className="landing-section landing-steps-section" id="how-it-works" initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <FadeUp className="landing-section-heading"><span className="landing-kicker">{t('landingHowItWorks')}</span><h2>{t('landingStepsHeading')}</h2><p>{t('landingStepsDescription')}</p></FadeUp>
    <div className="landing-steps">
      <svg className="landing-step-connector landing-step-connector-horizontal" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M0 1 H100" pathLength={scrollYProgress} /></svg>
      <svg className="landing-step-connector landing-step-connector-vertical" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M1 0 V100" pathLength={scrollYProgress} /></svg>
      <StaggerContainer className="landing-step-stagger">{steps.map(({icon:Icon,number,title,text})=><StaggerItem className="landing-step-item" key={number}><motion.article className="landing-step" whileHover={reducedMotion ? undefined : { y: -5 }} transition={{ duration: 0.4, ease: 'easeOut' }}><div className="landing-step-top"><span className="landing-step-icon"><Icon size={21}/></span><motion.span className="landing-step-number" initial={{ scale: reducedMotion ? 1 : 0.65, opacity: reducedMotion ? 1 : 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 420, damping: 18, delay: reducedMotion ? 0 : 0.18 }}>{number}</motion.span></div><h3>{title}</h3><p>{text}</p></motion.article></StaggerItem>)}</StaggerContainer>
    </div>
  </motion.section>
}

export function Features() {
  const { t } = useTranslation()
  const features = [
    { icon: MessageCircleQuestion, title: t('landingFeatureQa'), text: t('landingFeatureQaText') },
    { icon: BookOpenText, title: t('landingFeatureCitations'), text: t('landingFeatureCitationsText') },
    { icon: PanelTop, title: t('landingFeatureSummaries'), text: t('landingFeatureSummariesText') },
    { icon: GraduationCap, title: t('landingFeatureSimple'), text: t('landingFeatureSimpleText') },
    { icon: Languages, title: t('landingFeatureTranslate'), text: t('landingFeatureTranslateText') },
    { icon: Microscope, title: t('landingFeatureQuiz'), text: t('landingFeatureQuizText') },
  ]
  const reducedMotion = useReducedMotion()
  return <motion.section className="landing-section landing-features-section" id="features" initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <FadeUp className="landing-section-heading"><span className="landing-kicker">{t('landingFeatures')}</span><h2>{t('landingFeaturesHeading')}</h2><p>{t('landingFeaturesDescription')}</p></FadeUp>
    <StaggerContainer className="landing-feature-grid">{features.map(({icon:Icon,title,text})=><StaggerItem className="landing-feature-item" key={title}><motion.article className="landing-feature-card" whileHover={reducedMotion ? undefined : { y: -5 }} transition={{ duration: 0.4, ease: 'easeOut' }}><span className="landing-feature-icon"><Icon size={20}/></span><h3>{title}</h3><p>{text}</p><ArrowRight className="landing-feature-arrow" size={16}/></motion.article></StaggerItem>)}</StaggerContainer>
  </motion.section>
}

export function BilingualDemo() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  return <motion.section className="landing-section landing-demo-section" initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <FadeUp className="landing-demo-copy"><span className="landing-kicker">{t('landingMadeForBoth')}</span><h2>{t('landingDemoHeading')}</h2><p>{t('landingDemoDescription')}</p><div className="landing-demo-language"><span>EN</span><ArrowRight size={15}/><span>नेपाली</span></div></FadeUp>
    <StaggerContainer className="landing-demo-cards">{[[t('landingDemoQuestion',{lng:'en'}),t('landingDemoEnglish',{lng:'en'}),''],[t('landingDemoQuestionNe',{lng:'ne'}),t('landingDemoNepali',{lng:'ne'}),'nepali']].map(([question,answer,variant],index)=><StaggerItem key={variant||'english'}><article className={`landing-demo-card ${variant}`}><span className="demo-label"><i/>{index===0?'ENGLISH':'नेपाली'}</span><h3>{question}</h3><p>{answer}</p><span className="demo-citation">{t('landingSourceChip')} · {t('landingPageChip')}</span></article></StaggerItem>)}</StaggerContainer>
  </motion.section>
}

export function FAQ() {
  const { t } = useTranslation()
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()
  const questions = [
    [t('landingFaqFiles'),t('landingFaqFilesAnswer')],
    [t('landingFaqNepali'),t('landingFaqNepaliAnswer')],
    [t('landingFaqPrivacy'),t('landingFaqPrivacyAnswer')],
    [t('landingFaqCost'),t('landingFaqCostAnswer')],
    [t('landingFaqAccuracy'),t('landingFaqAccuracyAnswer')],
  ]
  return <motion.section className="landing-section landing-faq-section" id="faq" initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}>
    <FadeUp className="landing-section-heading"><span className="landing-kicker">{t('landingFaq')}</span><h2>{t('landingFaqHeading')}</h2><p>{t('landingFaqDescription')}</p></FadeUp>
    <StaggerContainer className="landing-faq-list">{questions.map(([question,answer],index)=><StaggerItem key={question}><article className={`landing-faq-item ${activeFaq===index?'open':''}`}><button className="landing-faq-question" type="button" aria-expanded={activeFaq===index} onClick={()=>setActiveFaq(activeFaq===index?null:index)}>{question}<motion.span animate={{ rotate: activeFaq===index?45:0 }} transition={{ duration:reducedMotion?0:0.4, ease:'easeOut' }}><Plus size={18}/></motion.span></button><AnimatePresence initial={false}>{activeFaq===index&&<motion.div className="landing-faq-answer" id={`landing-faq-answer-${index}`} initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:reducedMotion?0:0.42, ease:'easeOut' }}><p>{answer}</p></motion.div>}</AnimatePresence></article></StaggerItem>)}</StaggerContainer>
  </motion.section>
}

export function CTA() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  return <motion.section className="landing-cta" id="support" initial={{ opacity:0, y:reducedMotion?0:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, amount:0.2 }} transition={{ duration:reducedMotion?0:0.65, ease:'easeOut' }}><div className="landing-cta-spark"><Sparkles size={20}/></div><span>{t('landingCtaEyebrow')}</span><h2>{t('landingCtaHeading')}</h2><p>{t('landingCtaDescription')}</p><motion.div whileHover={reducedMotion?undefined:{scale:1.035}} whileTap={reducedMotion?undefined:{scale:0.97}}><Link className="landing-button light" to="/signup">{t('landingGetStarted')}<ArrowRight size={16}/></Link></motion.div></motion.section>
}

export function Footer() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  return <motion.footer className="landing-footer" initial={{ opacity:0, y:reducedMotion?0:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:reducedMotion?0:0.55, ease:'easeOut' }}><a className="landing-home" href="#top" aria-label="DocuSathi AI home"><BrandLockup /></a><nav aria-label={t('landingFooterNavigation')}><a href="#features">{t('landingFeatures')}</a><a href="#how-it-works">{t('landingHowItWorks')}</a><a href="#faq">{t('landingFaq')}</a><a href="#support">{t('landingSupport')}</a><Link to="/login">{t('landingLogin')}</Link></nav><span>{t('landingCopyright',{year:new Date().getFullYear()})}</span></motion.footer>
}

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('docintel_landing_theme') === 'dark')
  const toggleTheme = () => setDarkMode(current => {
    const next = !current
    localStorage.setItem('docintel_landing_theme', next ? 'dark' : 'light')
    return next
  })
  useEffect(() => { document.title = t('landingPageTitle') }, [t, i18n.resolvedLanguage])
  const reducedMotion = useReducedMotion()
  return <LazyMotion features={domAnimation}><motion.main className={`landing-page${darkMode ? ' dark' : ''}`} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:reducedMotion?0:0.45, ease:'easeOut' }}>
    <Navbar darkMode={darkMode} onToggleTheme={toggleTheme} />
    <Hero />
    <TrustedBy />
    <Steps />
    <Features />
    <BilingualDemo />
    <FAQ />
    <CTA />
    <Footer />
  </motion.main></LazyMotion>
}
