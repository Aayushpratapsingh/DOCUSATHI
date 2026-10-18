import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check, ClipboardList, Eye, Layers, LoaderCircle, RotateCw, Trash2, XCircle } from 'lucide-react'
import { api, type DocumentItem, type StudyGeneratePayload, type StudyItem, type StudyKind, type StudyProgress, type StudyQuestionType, type StudySet } from '../api'

const emptyProgress = (): StudyProgress => ({ current_index: 0, answers: {}, statuses: {}, completed: false, score: 0 })
const answerKey = (index: number) => String(index)
const normalizeAnswer = (value: string) => value.trim().toLocaleLowerCase().replace(/[.,!?;:()[\]{}"'`]/g, '').replace(/\s+/g, ' ')

export default function QuizFlashcardStudio({ docs, initialDocumentId = null, initialKind = null, fixedKind = null }: { docs: DocumentItem[]; initialDocumentId?: number | null; initialKind?: StudyKind | null; fixedKind?: StudyKind | null }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [documentId, setDocumentId] = useState(initialDocumentId ? String(initialDocumentId) : '')
  const [kind, setKind] = useState<StudyKind>(initialKind ?? 'quiz')
  const [chapter, setChapter] = useState('')
  const [pageStart, setPageStart] = useState('')
  const [pageEnd, setPageEnd] = useState('')
  const [difficulty, setDifficulty] = useState<StudyGeneratePayload['difficulty']>('medium')
  const [count, setCount] = useState(10)
  const [questionType, setQuestionType] = useState<StudyQuestionType>('mixed')
  const [language, setLanguage] = useState<'en' | 'ne'>(i18n.resolvedLanguage === 'ne' ? 'ne' : 'en')
  const [activeSet, setActiveSet] = useState<StudySet | null>(null)
  const [mode, setMode] = useState<'quiz' | 'study'>('quiz')
  const [selection, setSelection] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const documentIdNumber = Number(documentId)
  const selectedDocument = docs.find(doc => doc.id === documentIdNumber)
  const savedSets = useQuery({ queryKey: ['study-sets'], queryFn: api.studySets })
  const options = useQuery({ queryKey: ['study-options', documentIdNumber], queryFn: () => api.studyOptions(documentIdNumber), enabled: Boolean(selectedDocument && selectedDocument.processing_status === 'ready') })

  useEffect(() => {
    if (initialDocumentId) setDocumentId(String(initialDocumentId))
    if (fixedKind) setKind(fixedKind)
    else if (initialKind) setKind(initialKind)
  }, [initialDocumentId, initialKind, fixedKind])

  useEffect(() => {
    setActiveSet(null)
    setError('')
  }, [fixedKind])

  useEffect(() => {
    setChapter('')
    setPageStart('')
    setPageEnd('')
  }, [documentId])

  useEffect(() => {
    if (!activeSet) {
      setSelection('')
      setRevealed(false)
      return
    }
    setSelection(activeSet.progress.answers[answerKey(activeSet.progress.current_index)] ?? '')
    setRevealed(false)
  }, [activeSet?.id, activeSet?.progress.current_index])

  const generate = useMutation({
    mutationFn: (payload: StudyGeneratePayload) => api.generateStudySet(documentIdNumber, payload),
    onSuccess: studySet => {
      setError('')
      setActiveSet(studySet)
      void queryClient.invalidateQueries({ queryKey: ['study-sets'] })
    },
    onError: (cause: Error) => setError(cause.message),
  })
  const saveProgress = useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: StudyProgress }) => api.updateStudyProgress(id, progress),
    onSuccess: studySet => {
      setActiveSet(studySet)
      queryClient.setQueryData<StudySet[]>(['study-sets'], previous => previous?.map(item => item.id === studySet.id ? studySet : item))
      setError('')
    },
    onError: (cause: Error) => setError(cause.message),
  })
  const regenerate = useMutation({
    mutationFn: ({ id, index }: { id: number; index: number }) => api.regenerateStudyItem(id, index),
    onSuccess: studySet => {
      setActiveSet(studySet)
      queryClient.setQueryData<StudySet[]>(['study-sets'], previous => previous?.map(item => item.id === studySet.id ? studySet : item))
      setError('')
    },
    onError: (cause: Error) => setError(cause.message),
  })
  const removeSet = useMutation({
    mutationFn: api.deleteStudySet,
    onSuccess: (_result, id) => {
      if (activeSet?.id === id) setActiveSet(null)
      queryClient.setQueryData<StudySet[]>(['study-sets'], previous => previous?.filter(item => item.id !== id))
      setError('')
    },
    onError: (cause: Error) => setError(cause.message),
  })

  const submitGeneration = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedDocument || selectedDocument.processing_status !== 'ready') return
    if (pageStart && pageEnd && Number(pageStart) > Number(pageEnd)) {
      setError(t('studyInvalidPageRange'))
      return
    }
    setError('')
    generate.mutate({
      kind,
      chapter: chapter || null,
      page_start: pageStart ? Number(pageStart) : null,
      page_end: pageEnd ? Number(pageEnd) : null,
      difficulty,
      count,
      question_type: kind === 'quiz' ? questionType : 'mixed',
      language,
    })
  }

  const itemIndex = activeSet?.progress.current_index ?? 0
  const item = activeSet?.items[itemIndex]
  const progress = activeSet?.progress
  const answered = Boolean(progress?.answers[answerKey(itemIndex)])
  const persist = (next: StudyProgress) => {
    if (!activeSet) return
    setActiveSet({ ...activeSet, progress: next })
    saveProgress.mutate({ id: activeSet.id, progress: next })
  }
  const correct = (studyItem: StudyItem, value: string) => normalizeAnswer(value) === normalizeAnswer(studyItem.correct_answer ?? '')
  const answerCurrent = () => {
    if (!activeSet || !item || !selection.trim()) return
    const answers = { ...activeSet.progress.answers, [answerKey(itemIndex)]: selection.trim() }
    const progressNext: StudyProgress = { ...activeSet.progress, answers, current_index: itemIndex }
    persist(progressNext)
  }
  const advance = () => {
    if (!activeSet || !item) return
    const nextIndex = Math.min(itemIndex + 1, activeSet.items.length)
    const completed = nextIndex >= activeSet.items.length
    const scoreCount = activeSet.items.reduce((total, quizItem, index) => {
      const response = activeSet.progress.answers[answerKey(index)]
      return total + (response && correct(quizItem, response) ? 1 : 0)
    }, 0)
    persist({
      ...activeSet.progress,
      current_index: nextIndex,
      completed,
      score: completed ? Math.round(scoreCount / activeSet.items.length * 100) : activeSet.progress.score,
    })
    setRevealed(false)
  }
  const markCard = (status: 'know' | 'review') => {
    if (!activeSet || !item) return
    const nextIndex = itemIndex + 1
    persist({
      ...activeSet.progress,
      current_index: nextIndex,
      statuses: { ...activeSet.progress.statuses, [answerKey(itemIndex)]: status },
      completed: nextIndex >= activeSet.items.length,
    })
  }
  const openSet = (studySet: StudySet, nextMode: 'quiz' | 'study') => {
    setActiveSet(studySet)
    setMode(nextMode)
    setError('')
  }
  const resetSet = () => {
    if (!activeSet) return
    persist(emptyProgress())
  }
  const pagesFor = (studyItem: StudyItem) => studyItem.page_numbers.map(page => `${t('pageSuffix')} ${page}`).join(', ')
  const setDocumentName = (studySet: StudySet) => docs.find(doc => doc.id === studySet.document_id)?.filename ?? t('document')
  const quizTypes: { id: StudyQuestionType; label: string }[] = [
    { id: 'mixed', label: t('studyTypeMixed') },
    { id: 'multiple_choice', label: t('studyTypeMcq') },
    { id: 'short_answer', label: t('studyTypeShort') },
    { id: 'true_false', label: t('studyTypeTrueFalse') },
  ]

  return <section className="study-tool content">
    <div className="study-tool-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line" />{t('studyToolsEyebrow')}</div>
        <h2>{t(fixedKind === 'quiz' ? 'quizSection' : fixedKind === 'flashcards' ? 'flashcardSection' : 'studyToolsTitle')}</h2>
        <p>{t('studyToolsDescription')}</p>
      </div>
      {activeSet && <button className="secondary-btn" onClick={() => setActiveSet(null)}><ArrowLeft size={14}/>{t('studyBackToSets')}</button>}
    </div>

    {!activeSet ? <>
      <form className="study-generation-form" onSubmit={submitGeneration}>
        <label>{t('document')}
          <select required value={documentId} onChange={event => setDocumentId(event.target.value)}>
            <option value="">{t('chooseDocument')}</option>
            {docs.map(doc => <option key={doc.id} value={doc.id} disabled={doc.processing_status !== 'ready'}>{doc.filename}{doc.processing_status !== 'ready' ? ` (${t('processing')})` : ''}</option>)}
          </select>
        </label>
        {!fixedKind && <div className="study-kind-switch" role="group" aria-label={t('studyKind')}>
          <button type="button" className={kind === 'quiz' ? 'selected' : ''} aria-pressed={kind === 'quiz'} onClick={() => setKind('quiz')}><ClipboardList size={15}/>{t('generateQuiz')}</button>
          <button type="button" className={kind === 'flashcards' ? 'selected' : ''} aria-pressed={kind === 'flashcards'} onClick={() => setKind('flashcards')}><Layers size={15}/>{t('generateFlashcards')}</button>
        </div>}
        <label>{t('studyChapter')}
          <select value={chapter} onChange={event => setChapter(event.target.value)} disabled={!options.data?.chapters.length}>
            <option value="">{t('studyAllContent')}</option>
            {options.data?.chapters.map(item => <option key={item.title} value={item.title}>{item.title}{item.page_start ? ` · ${t('pageSuffix')} ${item.page_start}${item.page_end && item.page_end !== item.page_start ? `–${item.page_end}` : ''}` : ''}</option>)}
          </select>
        </label>
        <label>{t('studyPageFrom')}
          <select value={pageStart} onChange={event => setPageStart(event.target.value)} disabled={!options.data?.pages.length}>
            <option value="">{t('studyAnyPage')}</option>
            {options.data?.pages.map(page => <option key={page} value={page}>{page}</option>)}
          </select>
        </label>
        <label>{t('studyPageTo')}
          <select value={pageEnd} onChange={event => setPageEnd(event.target.value)} disabled={!options.data?.pages.length}>
            <option value="">{t('studyAnyPage')}</option>
            {options.data?.pages.map(page => <option key={page} value={page}>{page}</option>)}
          </select>
        </label>
        <label>{t('studyDifficulty')}
          <select value={difficulty} onChange={event => setDifficulty(event.target.value as StudyGeneratePayload['difficulty'])}>
            <option value="easy">{t('studyEasy')}</option><option value="medium">{t('studyMedium')}</option><option value="hard">{t('studyHard')}</option>
          </select>
        </label>
        <label>{t('studyNumber')}
          <input type="number" min="1" max="20" value={count} onChange={event => setCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}/>
        </label>
        {kind === 'quiz' && <label>{t('studyQuestionType')}
          <select value={questionType} onChange={event => setQuestionType(event.target.value as StudyQuestionType)}>
            {quizTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>}
        <label>{t('studyOutputLanguage')}
          <select value={language} onChange={event => setLanguage(event.target.value as 'en' | 'ne')}><option value="en">English</option><option value="ne">नेपाली</option></select>
        </label>
        {options.isError && <p className="error study-tool-error" role="alert">{options.error.message}</p>}
        {error && <p className="error study-tool-error" role="alert">{error}</p>}
        <button className="primary study-generate-button" disabled={generate.isPending || !selectedDocument || selectedDocument.processing_status !== 'ready' || options.isLoading}>
          {generate.isPending ? <LoaderCircle size={15} className="spin"/> : kind === 'quiz' ? <ClipboardList size={15}/> : <Layers size={15}/>}
          {generate.isPending ? t('studyGenerating') : kind === 'quiz' ? t('generateQuiz') : t('generateFlashcards')}
        </button>
        {selectedDocument?.processing_status === 'ready' && !options.isLoading && !options.data?.pages.length && <p className="study-source-hint">{t('studyNoPages')}</p>}
      </form>

      <div className="saved-study-sets">
        <h3>{t('savedStudySets')}</h3>
        {savedSets.isLoading ? <div className="study-set-empty"><LoaderCircle size={17} className="spin"/>{t('studyLoadingSets')}</div> : savedSets.isError ? <p className="error" role="alert">{savedSets.error.message}</p> : savedSets.data?.some(studySet => !fixedKind || studySet.kind === fixedKind) ? <div className="study-set-list">
          {savedSets.data.filter(studySet => !fixedKind || studySet.kind === fixedKind).map(studySet => <article className="study-set-row" key={studySet.id}>
            <div className="study-set-icon">{studySet.kind === 'quiz' ? <ClipboardList size={17}/> : <Layers size={17}/>}</div>
            <div className="study-set-copy"><strong>{studySet.title}</strong><span>{setDocumentName(studySet)} · {studySet.items.length} {studySet.kind === 'quiz' ? t('studyQuestions') : t('studyCards')} · {studySet.config.language === 'ne' ? 'नेपाली' : 'English'}</span></div>
            <button className="study-set-open" onClick={() => openSet(studySet, studySet.kind === 'quiz' ? 'quiz' : 'study')}>{studySet.kind === 'quiz' ? t('studyResume') : t('studyResumeCards')}<ArrowRight size={14}/></button>
            <button className="study-set-delete" aria-label={`${t('studyDeleteSet')} ${studySet.title}`} title={t('studyDeleteSet')} onClick={() => removeSet.mutate(studySet.id)} disabled={removeSet.isPending}><Trash2 size={15}/></button>
          </article>)}
        </div> : <div className="study-set-empty">{t('studyNoSavedSets')}</div>}
      </div>
    </> : <div className="study-run">
      <div className="study-run-top"><div><span className="study-set-kind">{activeSet.kind === 'quiz' ? t('studyScoredQuiz') : t('studyFlashcards')}</span><h3>{activeSet.title}</h3></div><div className="study-run-actions">
        {activeSet.kind === 'quiz' && <><button className={mode === 'quiz' ? 'selected' : ''} onClick={() => {setMode('quiz');setRevealed(false)}}>{t('studyQuizMode')}</button><button className={mode === 'study' ? 'selected' : ''} onClick={() => {setMode('study');setRevealed(false)}}><Eye size={14}/>{t('studyMode')}</button></>}
        <button onClick={resetSet}><RotateCw size={14}/>{t('studyRestart')}</button>
      </div></div>
      {activeSet.progress.completed ? <div className="study-complete">
        <div className="study-complete-icon"><Check size={22}/></div>
        <h3>{activeSet.kind === 'quiz' ? t('studyQuizComplete') : t('studyCardsComplete')}</h3>
        {activeSet.kind === 'quiz' ? <p>{t('studyScoreSummary', { score: activeSet.progress.score, correct: Math.round(activeSet.progress.score * activeSet.items.length / 100), total: activeSet.items.length })}</p> : <p>{t('studyCardSummary', { know: Object.values(activeSet.progress.statuses).filter(status => status === 'know').length, total: activeSet.items.length })}</p>}
        <button className="primary" onClick={resetSet}><RotateCw size={14}/>{t('studyTryAgain')}</button>
      </div> : item ? <article className="study-question-card">
        <div className="study-question-meta"><span>{activeSet.kind === 'quiz' ? t('studyQuestionLabel', { current: itemIndex + 1, total: activeSet.items.length }) : t('studyCardLabel', { current: itemIndex + 1, total: activeSet.items.length })}</span><span>{t('studyPages')}: {pagesFor(item)}</span></div>
        <h3>{activeSet.kind === 'quiz' ? item.question : item.front}</h3>
        {activeSet.kind === 'quiz' ? <div className="study-answer-input">
          {item.question_type === 'multiple_choice' || item.question_type === 'true_false' ? item.options?.map(option => <label className={`study-option ${answered && normalizeAnswer(option) === normalizeAnswer(item.correct_answer ?? '') ? 'correct' : ''}`} key={option}><input type="radio" name={`study-answer-${activeSet.id}-${itemIndex}`} value={option} checked={selection === option} disabled={answered || mode === 'study'} onChange={() => setSelection(option)}/><span>{option}</span>{answered && normalizeAnswer(option) === normalizeAnswer(item.correct_answer ?? '') && <Check size={15}/>}</label>) : <textarea value={selection} onChange={event => setSelection(event.target.value)} placeholder={t('studyTypeAnswer')} disabled={answered || mode === 'study'} rows={3}/>}
          {mode === 'quiz' && !answered && <button className="primary" onClick={answerCurrent} disabled={!selection.trim() || saveProgress.isPending}>{saveProgress.isPending ? <LoaderCircle size={14} className="spin"/> : null}{t('studyCheckAnswer')}</button>}
          {mode === 'study' && <button className="secondary-btn" onClick={() => setRevealed(value => !value)}><Eye size={14}/>{revealed ? t('studyHideAnswer') : t('studyRevealAnswer')}</button>}
          {(answered || revealed) && <div className={`study-feedback ${mode === 'quiz' && answered && correct(item, selection) ? 'right' : mode === 'quiz' ? 'wrong' : ''}`}><strong>{mode === 'study' ? `${t('studyAnswer')}: ${item.correct_answer}` : correct(item, activeSet.progress.answers[answerKey(itemIndex)] ?? '') ? t('studyCorrect') : t('studyNotQuite')}</strong><p>{item.explanation}</p><span>{t('studyCorrectAnswer')}: {item.correct_answer}</span></div>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="study-question-footer"><button className="study-regenerate" onClick={() => regenerate.mutate({ id: activeSet.id, index: itemIndex })} disabled={regenerate.isPending}><RotateCw size={14}/>{regenerate.isPending ? t('studyRegenerating') : t('studyRegenerateQuestion')}</button><button className="primary" onClick={advance} disabled={(mode === 'quiz' && !answered) || saveProgress.isPending}>{itemIndex + 1 === activeSet.items.length ? t('studyFinishQuiz') : t('studyNextQuestion')}<ArrowRight size={14}/></button></div>
        </div> : <div className="study-flashcard-area">
          <button className={`study-flashcard ${revealed ? 'flipped' : ''}`} onClick={() => setRevealed(value => !value)} aria-label={revealed ? t('studyHideAnswer') : t('studyRevealAnswer')}>
            <span className="study-flashcard-hint">{revealed ? t('studyCardBack') : t('studyCardFront')} · {t('studyTapToFlip')}</span>
            <strong>{revealed ? item.back : item.front}</strong>
            {revealed && <><p>{item.explanation}</p><span className="study-pages">{t('studyPages')}: {pagesFor(item)}</span></>}
          </button>
          <div className="study-flashcard-actions"><button className="secondary-btn" onClick={() => markCard('review')} disabled={!revealed || saveProgress.isPending}><XCircle size={15}/>{t('studyReviewAgain')}</button><button className="primary" onClick={() => markCard('know')} disabled={!revealed || saveProgress.isPending}><Check size={15}/>{t('studyKnow')}</button></div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="study-regenerate" onClick={() => regenerate.mutate({ id: activeSet.id, index: itemIndex })} disabled={regenerate.isPending}><RotateCw size={14}/>{regenerate.isPending ? t('studyRegenerating') : t('studyRegenerateQuestion')}</button>
        </div>}
      </article> : null}
    </div>}
  </section>
}
