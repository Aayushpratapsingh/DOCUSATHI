import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,Plus,Search,Languages,Trash2,Send,Sparkles,
  PanelLeftClose,
  LogOut,
  LoaderCircle,
  ChevronRight,
  ShieldCheck,
  UserRound,
  House,
  LibraryBig,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Bookmark as BookmarkIcon,
  ClipboardList,
  Layers,
  Star,
  Pin,
  NotebookPen,
  ArrowUpRight,
} from "lucide-react";
import {
  api,
  Bookmark,
  ChatMessage,
  DocumentItem,
  RecentChat,
  Source,
  StudyNote,
  StudyKind,
  UserProfile,
} from "./api";
import QuizFlashcardStudio from "./components/QuizFlashcardStudio";

function BrandSymbol() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M7 15c4-1.5 8-.8 15 2.8v17.5c-5.7-3-10.4-3.6-15-2V15Zm34 0c-4-1.5-8-.8-15 2.8v17.5c5.7-3 10.4-3.6 15-2V15Z"
        fill="white"
      />
      <path
        d="M24 18v17M11 25c3-.7 6-.2 8 1m-8 3c3-.7 6-.2 8 1m18-5c-3-.7-6-.2-8 1m8 2c-3-.7-6-.2-8 1"
        fill="none"
        stroke="#356b4b"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <text
        x="10.5"
        y="23"
        fill="#356b4b"
        fontFamily="Noto Sans Devanagari, sans-serif"
        fontSize="7.5"
        fontWeight="700"
      >
        अ
      </text>
      <text
        x="29"
        y="23"
        fill="#356b4b"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fontWeight="800"
      >
        A
      </text>
      <path
        d="m38 5 1.4 3.5L43 10l-3.6 1.4L38 15l-1.4-3.6L33 10l3.6-1.5L38 5Z"
        fill="#e6ae46"
      />
    </svg>
  );
}

function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const { t, i18n } = useTranslation();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      register
        ? api.register(name, email, password)
        : api.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem("docintel_token", data.access_token);
      onLogin();
    },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <main className="auth-wrap">
      <button
        className="language-toggle auth-language"
        style={{ position: "fixed", top: 24, right: 28, zIndex: 2 }}
        aria-label={t("language")}
        title={t("language")}
        onClick={() => {
          const language = i18n.language === "en" ? "ne" : "en";
          localStorage.setItem("docintel_language", language);
          void i18n.changeLanguage(language);
        }}
      >
        <Languages size={16} />
        <span>{i18n.language === "en" ? "EN" : "ने"}</span>
        <span className="toggle-dot" />
      </button>
      <div className="auth-card">
        <div className="brand-lockup">
          <div className="brand-mark brand-mark-large">
            <BrandSymbol />
          </div>
          <span className="brand-wordmark">
            Docu<span className="brand-accent">Sathi</span> AI
          </span>
        </div>
        <p className="eyebrow">{t("authEyebrow")}</p>
        <h1>{register ? t("authCreate") : t("authWelcome")}</h1>
        <p className="muted">{t("authSubtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {register && (
            <label>
              {t("name")}
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            {t("email")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t("password")}
            <input
              type="password"
              minLength={10}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              t("submit")
            )}
            <ChevronRight size={17} />
          </button>
        </form>
        <button
          className="link-button"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? t("hasAccount") : t("noAccount")}{" "}
          <strong>{register ? t("signIn") : t("create")}</strong>
        </button>
        <div className="privacy-note">
          <ShieldCheck size={15} /> {t("privacy")}
        </div>
      </div>
    </main>
  );
}

function ProfilePage({
  profile,
  saving,
  saved,
  error,
  onSave,
}: {
  profile: UserProfile | undefined;
  saving: boolean;
  saved: boolean;
  error: string;
  onSave: (name: string, email: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  useEffect(() => {
    setName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
  }, [profile?.name, profile?.email]);
  return (
    <section className="content profile-page">
      <div className="profile-heading">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {t("accountSettings")}
        </div>
        <h1>{t("yourProfile")}</h1>
        <p>{t("profileDescription")}</p>
      </div>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim(), email.trim());
        }}
      >
        <div className="profile-form-header">
          <div className="profile-large-avatar">
            {(profile?.name || name || "D").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{t("personalProfile")}</strong>
            <span>{t("changesApply")}</span>
          </div>
        </div>
        <label htmlFor="profile-name">{t("name")}</label>
        <input
          id="profile-name"
          name="name"
          autoComplete="name"
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor="profile-email">{t("email")}</label>
        <input
          id="profile-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && (
          <p className="error profile-feedback" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="profile-success" role="status">
            {t("profileUpdated")}
          </p>
        )}
        <div className="profile-form-footer">
          <span>{t("accountHistory")}</span>
          <button
            className="primary"
            disabled={!profile || saving || !name.trim() || !email.trim()}
          >
            {saving ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              t("saveChanges")
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/documents\/(\d+)$/);
  const selected = routeMatch ? Number(routeMatch[1]) : null;
  const isProfile = location.pathname === "/profile";
  const isWorkspace = location.pathname === "/workspace";
  const isLibrary = location.pathname === "/documents";
  const routeStudyKind: StudyKind | null =
    location.pathname === "/study/quiz"
      ? "quiz"
      : location.pathname === "/study/flashcards"
        ? "flashcards"
        : null;
  const legacyStudyKind =
    location.pathname === "/study" &&
    new URLSearchParams(location.search).get("kind") === "flashcards"
      ? "flashcards"
      : location.pathname === "/study" &&
          new URLSearchParams(location.search).get("kind") === "quiz"
        ? "quiz"
        : null;
  const studyKind = routeStudyKind ?? legacyStudyKind;
  const isStudy =
    location.pathname === "/study" ||
    location.pathname === "/study/quiz" ||
    location.pathname === "/study/flashcards";
  const isDocument = selected !== null;
  const [signedIn, setSignedIn] = useState(
    !!localStorage.getItem("docintel_token"),
  );
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<{
    messageId: number;
    index: number;
  } | null>(null);
  const [translationCache, setTranslationCache] = useState<
    Record<string, string>
  >({});
  const [translatedView, setTranslatedView] = useState<Record<string, boolean>>(
    {},
  );
  const [translationErrors, setTranslationErrors] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{
    doc: DocumentItem;
    mode: "rename" | "delete";
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);
  const openStudyTools = (documentId: number, kind: StudyKind) =>
    navigate(`/study/${kind}?documentId=${documentId}`);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    enabled: signedIn,
    retry: false,
  });
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: api.documents,
    enabled: signedIn,
    refetchInterval: 3000,
  });
  const recentChats = useQuery({
    queryKey: ["recentChats"],
    queryFn: api.recentChats,
    enabled: signedIn,
    refetchInterval: 10000,
  });
  const notes = useQuery({
    queryKey: ["notes"],
    queryFn: api.notes,
    enabled: signedIn,
  });
  const bookmarks = useQuery({
    queryKey: ["bookmarks"],
    queryFn: api.bookmarks,
    enabled: signedIn,
  });
  const messages = useQuery({
    queryKey: ["messages", selected],
    queryFn: () => api.messages(selected!),
    enabled: signedIn && selected !== null,
  });
  useEffect(() => {
    if (me.isError) {
      localStorage.removeItem("docintel_token");
      setSignedIn(false);
    }
  }, [me.isError]);
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);
  useEffect(() => {
    if (signedIn && location.pathname === "/")
      navigate("/workspace", { replace: true });
  }, [signedIn, location.pathname, navigate]);
  const upload = useMutation({
    mutationFn: api.upload,
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      navigate(`/documents/${doc.id}`);
      setSelectedSource(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });
  const retry = useMutation({
    mutationFn: api.retry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: api.remove,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["recentChats"] });
      if (selected === id) navigate("/documents");
      setDialog(null);
    },
  });
  const rename = useMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      api.rename(id, filename),
    onSuccess: (doc) => {
      qc.setQueryData<DocumentItem[]>(["documents"], (previous) =>
        previous?.map((item) => (item.id === doc.id ? doc : item)),
      );
      qc.invalidateQueries({ queryKey: ["recentChats"] });
      setDialog(null);
    },
  });
  const ask = useMutation({
    mutationFn: ({ id, q }: { id: number; q: string }) => api.ask(id, q),
    onSuccess: (_data, variables) => {
      setSelectedSource(null);
      setError("");
      qc.invalidateQueries({ queryKey: ["recentChats"] });
      return qc.invalidateQueries({ queryKey: ["messages", variables.id] });
    },
    onError: (e: Error) => setError(e.message),
  });
  const translation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.translateNepali(Number(id), text),
    onMutate: ({ id }) =>
      setTranslationErrors((prev) => ({ ...prev, [id]: "" })),
    onSuccess: (data, variables) => {
      setTranslationCache((prev) => ({
        ...prev,
        [variables.id]: data.translated_text,
      }));
      setTranslatedView((prev) => ({ ...prev, [variables.id]: true }));
    },
    onError: (e: Error, variables) =>
      setTranslationErrors((prev) => ({ ...prev, [variables.id]: e.message })),
  });
  const profileUpdate = useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) =>
      api.updateProfile(name, email),
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });
  const createNote = useMutation({
    mutationFn: api.createNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (e: Error) => setError(e.message),
  });
  const updateNote = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: number;
      changes: Partial<
        Pick<StudyNote, "title" | "content" | "tags" | "language">
      >;
    }) => api.updateNote(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (e: Error) => setError(e.message),
  });
  const deleteNote = useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (e: Error) => setError(e.message),
  });
  const createBookmark = useMutation({
    mutationFn: api.createBookmark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
    onError: (e: Error) => setError(e.message),
  });
  const deleteBookmark = useMutation({
    mutationFn: api.deleteBookmark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
    onError: (e: Error) => setError(e.message),
  });
  const setChatPreference = useMutation({
    mutationFn: ({
      id,
      preferences,
    }: {
      id: number;
      preferences: { is_pinned?: boolean; is_starred?: boolean };
    }) => api.setChatPreference(id, preferences),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recentChats"] }),
    onError: (e: Error) => setError(e.message),
  });
  if (!signedIn)
    return (
      <AuthScreen
        onLogin={() => {
          setSignedIn(true);
          qc.invalidateQueries();
          navigate("/workspace", { replace: true });
        }}
      />
    );
  const allDocs = docs.data ?? [];
  const current = allDocs.find((d) => d.id === selected) ?? null;
  const visible = allDocs.filter((d) =>
    d.filename.toLowerCase().includes(search.toLowerCase()),
  );
  const savedNotes = notes.data ?? [];
  const savedBookmarks = bookmarks.data ?? [];
  const doUpload = (file?: File) => {
    if (file) upload.mutate(file);
  };
  const sendQuestion = () => {
    const q = question.trim();
    if (!q || ask.isPending || current?.processing_status !== "ready") return;
    ask.mutate({ id: current.id, q });
    setQuestion("");
  };
  const goWorkspace = () => navigate("/workspace");
  const openRename = (doc: DocumentItem) => {
    setRenameValue(doc.filename);
    setDialog({ doc, mode: "rename" });
  };
  const openReference = (
    documentId: number,
    messageId: number | null,
    page: number | null,
    text: string,
  ) => {
    const params = new URLSearchParams();
    if (messageId) params.set("message", String(messageId));
    if (page) params.set("page", String(page));
    if (text) params.set("reference", text.slice(0, 1200));
    navigate(`/documents/${documentId}${params.size ? `?${params}` : ""}`);
  };
  useEffect(() => {
    if (!selected || !messages.data?.length) return;
    const params = new URLSearchParams(location.search);
    const messageId = Number(params.get("message"));
    const page = Number(params.get("page"));
    if (!messageId) return;
    const message = messages.data.find(
      (item) => item.id === messageId && item.role === "assistant",
    );
    if (!message) return;
    const sourceIndex = message.sources.findIndex((source) =>
      page ? source.page_number === page : true,
    );
    if (sourceIndex >= 0) setSelectedSource({ messageId, index: sourceIndex });
  }, [selected, location.search, messages.data]);
  const breadcrumb = isDocument ? (
    <>
      <button
        className="breadcrumb-workspace"
        onClick={() => navigate("/documents")}
      >
        {t("library")}
      </button>
      <ChevronRight size={14} />
      <strong>{current?.filename ?? t("document")}</strong>
    </>
  ) : isLibrary ? (
    <strong>{t("library")}</strong>
  ) : isWorkspace ? (
    <button className="breadcrumb-workspace" onClick={goWorkspace}>
      {t("workspace")}
    </button>
  ) : isProfile ? (
    <strong>{t("profile")}</strong>
  ) : isStudy ? (
    <strong>{studyKind === "quiz" ? t("quizSection") : studyKind === "flashcards" ? t("flashcardSection") : t("studySpace")}</strong>
  ) : (
    <strong>{t("workspace")}</strong>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">
              <BrandSymbol />
            </div>
            <span className="brand-wordmark">
              Docu<span className="brand-accent">Sathi</span> AI
            </span>
          </div>
          <button className="icon-btn subtle" aria-label={t("collapseSidebar")}>
            <PanelLeftClose size={17} />
          </button>
        </div>
        <nav className="primary-nav" aria-label={t("mainNavigation")}>
          <NavLink
            to="/workspace"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <div className="nav-icon">
              <House size={17} />
            </div>
            <span>{t("workspace")}</span>
          </NavLink>
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `nav-item ${isActive || isDocument ? "active" : ""}`
            }
          >
            <div className="nav-icon">
              <LibraryBig size={17} />
            </div>
            <span>{t("library")}</span>
          </NavLink>
          <NavLink
            to="/study"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <div className="nav-icon">
              <NotebookPen size={17} />
            </div>
            <span>{t("studySpace")}</span>
          </NavLink>
          <NavLink
            to="/study/quiz"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <div className="nav-icon"><ClipboardList size={17} /></div>
            <span>{t("quizSection")}</span>
          </NavLink>
          <NavLink
            to="/study/flashcards"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <div className="nav-icon"><Layers size={17} /></div>
            <span>{t("flashcardSection")}</span>
          </NavLink>
        </nav>
        <div className="side-section">
          <div className="side-heading">
            {t("recentDocuments")}
            <button
              className="icon-btn tiny"
              onClick={() => fileRef.current?.click()}
              aria-label={t("upload")}
            >
              <Plus size={15} />
            </button>
          </div>
          {allDocs.slice(0, 6).map((d) => (
            <button
              key={d.id}
              onClick={() => {
                navigate(`/documents/${d.id}`);
                setSelectedSource(null);
                setError("");
              }}
              className={`doc-row ${selected === d.id ? "chosen" : ""}`}
            >
              <FileText size={15} />
              <span>{d.filename}</span>
            </button>
          ))}
        </div>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-item profile-nav ${isActive ? "active" : ""}`
          }
        >
          <div className="nav-icon">
            <UserRound size={17} />
          </div>
          <span>{t("profile")}</span>
        </NavLink>
        <div className="sidebar-bottom">
          <div className="profile">
            <button
              className="profile-open"
              onClick={() => navigate("/profile")}
              aria-label={t("openProfile")}
            >
              <div className="avatar">
                {me.data?.name?.slice(0, 1).toUpperCase() || "D"}
              </div>
              <div className="profile-copy">
                <strong>{me.data?.name || t("yourWorkspace")}</strong>
                <span>{t("personalPlan")}</span>
              </div>
            </button>
            <button
              className="icon-btn subtle"
              aria-label={t("signOut")}
              onClick={() => {
                localStorage.removeItem("docintel_token");
                setSignedIn(false);
                navigate("/", { replace: true });
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">{breadcrumb}</div>
          <div className="top-actions">
            <button
              className="language-toggle"
              aria-label={t("language")}
              title={t("language")}
              onClick={() => {
                const language = i18n.language === "en" ? "ne" : "en";
                localStorage.setItem("docintel_language", language);
                void i18n.changeLanguage(language);
              }}
            >
              <Languages size={16} />
              <span>{i18n.language === "en" ? "EN" : "ने"}</span>
              <span className="toggle-dot" />
            </button>
            <button
              className="avatar mini"
              onClick={() => navigate("/profile")}
              aria-label={t("openProfile")}
            >
              {me.data?.name?.slice(0, 1).toUpperCase() || "D"}
            </button>
          </div>
        </header>
        {isProfile ? (
          <ProfilePage
            profile={me.data}
            saving={profileUpdate.isPending}
            saved={profileUpdate.isSuccess}
            error={profileUpdate.error?.message ?? ""}
            onSave={(name, email) => {
              profileUpdate.reset();
              profileUpdate.mutate({ name, email });
            }}
          />
        ) : isStudy ? (
          <StudyDashboard
            docs={allDocs}
            notes={savedNotes}
            bookmarks={savedBookmarks}
            studyKind={studyKind}
            initialDocumentId={Number(new URLSearchParams(location.search).get("documentId")) || null}
            onOpenReference={openReference}
            onCreateNote={(payload) => createNote.mutate(payload)}
            onUpdateNote={(id, changes) => updateNote.mutate({ id, changes })}
            onDeleteNote={(id) => deleteNote.mutate(id)}
            onDeleteBookmark={(id) => deleteBookmark.mutate(id)}
          />
        ) : isWorkspace ? (
          <WorkspacePage
            docs={allDocs}
            recentChats={recentChats.data ?? []}
            onUpload={() => fileRef.current?.click()}
            onLibrary={() => navigate("/documents")}
            onContinue={() => {
              const chat = recentChats.data?.[0];
              if (chat) navigate(`/documents/${chat.document_id}`);
            }}
            onOpenChat={(id) => navigate(`/documents/${id}`)}
            onPreference={(id, preferences) =>
              setChatPreference.mutate({ id, preferences })
            }
          />
        ) : isLibrary ? (
          <LibraryPage
            docs={visible}
            query={search}
            onQuery={setSearch}
            onUpload={() => fileRef.current?.click()}
            onOpen={(doc) => navigate(`/documents/${doc.id}`)}
            onRename={openRename}
            onDelete={(doc) => setDialog({ doc, mode: "delete" })}
            onStudy={(doc, kind) => openStudyTools(doc.id, kind)}
            t={t}
          />
        ) : current ? (
          <section className="reader-layout">
            <div className="reader-main">
              <div className="doc-heading">
                <div className="file-icon large">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="eyebrow">{t("documentAssistant")}</div>
                  <h1>{current.filename}</h1>
                  <p>
                    {current.page_count
                      ? `${current.page_count} ${t("pageSuffix")} · `
                      : ""}
                    {current.processing_status === "ready"
                      ? t("readyToAsk")
                      : current.processing_status === "processing"
                        ? t("extractingIndexing")
                        : t("processingFailed")}
                  </p>
                </div>
                <button
                  className="study-action"
                  onClick={() => openStudyTools(current.id, "quiz")}
                  disabled={current.processing_status !== "ready"}
                >
                  <ClipboardList size={15} /> {t("generateQuiz")}
                </button>
                <button
                  className="study-action"
                  onClick={() => openStudyTools(current.id, "flashcards")}
                  disabled={current.processing_status !== "ready"}
                >
                  <Layers size={15} /> {t("generateFlashcards")}
                </button>
                <button
                  className="danger-btn"
                  onClick={() => setDialog({ doc: current, mode: "delete" })}
                  title={t("deleteDocument")}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="chat-panel">
                {new URLSearchParams(location.search).has("reference") && (
                  <div className="reference-banner">
                    <strong>
                      {t("savedReference")}
                      {new URLSearchParams(location.search).get("page")
                        ? ` · ${t("pageSuffix")} ${new URLSearchParams(location.search).get("page")}`
                        : ""}
                    </strong>
                    <p>
                      {new URLSearchParams(location.search).get("reference")}
                    </p>
                  </div>
                )}
                {current.processing_status === "processing" ? (
                  <div className="processing-state">
                    <LoaderCircle className="spin" />
                    <strong>{t("gettingDocumentReady")}</strong>
                    <span>{t("extractingPassages")}</span>
                  </div>
                ) : current.processing_status === "failed" ? (
                  <div className="processing-state">
                    <strong>{t("couldNotReadDocument")}</strong>
                    <span>{t("scannedPdfRetry")}</span>
                    <button
                      className="primary"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(current.id)}
                    >
                      {retry.isPending ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : null}
                      {t("retryProcessing")}
                    </button>
                    {error && <p className="error">{error}</p>}
                  </div>
                ) : messages.isLoading ? (
                  <div className="processing-state">
                    <LoaderCircle className="spin" />
                    <strong>{t("loadingConversation")}</strong>
                  </div>
                ) : (
                  <ConversationView
                    messages={messages.data ?? []}
                    t={t}
                    selectedSource={selectedSource}
                    setSelectedSource={setSelectedSource}
                    translationCache={translationCache}
                    translatedView={translatedView}
                    translationErrors={translationErrors}
                    translationPendingId={
                      translation.isPending ? translation.variables?.id : null
                    }
                    onTranslate={(id, text) =>
                      translation.mutate({ id: String(id), text })
                    }
                    onToggleTranslation={(id) =>
                      setTranslatedView((prev) => ({
                        ...prev,
                        [String(id)]: !prev[String(id)],
                      }))
                    }
                    onSuggest={setQuestion}
                    savedMessageIds={
                      new Set<number>(
                        savedNotes
                          .filter(
                            (note) =>
                              note.document_id === current.id &&
                              note.source_message_id !== null,
                          )
                          .map((note) => note.source_message_id!),
                      )
                    }
                    bookmarkedIds={
                      new Set<number>(
                        savedBookmarks
                          .filter(
                            (bookmark) =>
                              bookmark.document_id === current.id &&
                                bookmark.kind === "answer" &&
                                bookmark.source_message_id !== null,
                          )
                          .map((bookmark) => bookmark.source_message_id!),
                      )
                    }
                    onSaveAnswer={(message, content, language) =>
                      createNote.mutate({
                        document_id: current.id,
                        title:
                          content
                            .split(/\s+/)
                            .slice(0, 8)
                            .join(" ")
                            .slice(0, 80) || t("answer"),
                        content,
                        tags: "",
                        page_numbers: [
                          ...new Set(
                            message.sources.flatMap((source) =>
                              source.page_number ? [source.page_number] : [],
                            ),
                          ),
                        ],
                        language,
                        source_message_id: message.id,
                      })
                    }
                    onBookmarkAnswer={(message) =>
                      createBookmark.mutate({
                        document_id: current.id,
                        kind: "answer",
                        page_number: null,
                        page_numbers: [
                          ...new Set(
                            message.sources.flatMap((source) =>
                              source.page_number ? [source.page_number] : [],
                            ),
                          ),
                        ],
                        text: message.content,
                        source_message_id: message.id,
                      })
                    }
                    onBookmarkSource={(message, source) =>
                      createBookmark.mutate({
                        document_id: current.id,
                        kind: "passage",
                        page_number: source.page_number,
                        page_numbers: source.page_number
                          ? [source.page_number]
                          : [],
                        text: source.text,
                        source_message_id: message.id,
                      })
                    }
                  />
                )}
              </div>
              <form
                className="question-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendQuestion();
                }}
              >
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onCompositionStart={() => {
                    isComposing.current = true;
                  }}
                  onCompositionEnd={() => {
                    isComposing.current = false;
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    const native = e.nativeEvent;
                    if (
                      isComposing.current ||
                      native.isComposing ||
                      native.key === "Process" ||
                      native.keyCode === 229
                    )
                      return;
                    e.preventDefault();
                    sendQuestion();
                  }}
                  placeholder={t("ask")}
                  rows={2}
                  disabled={current.processing_status !== "ready"}
                />
                <div className="question-footer">
                  <span>
                    <Sparkles size={13} /> {t("groundedInDocument")}
                  </span>
                  <button
                    className="send-btn"
                    disabled={
                      !question.trim() ||
                      ask.isPending ||
                      current.processing_status !== "ready"
                    }
                    aria-label={t("sendQuestion")}
                  >
                    {ask.isPending ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </form>
              {error && current.processing_status === "ready" && (
                <p className="error inline-error">{error}</p>
              )}
            </div>
            <aside className="reader-side">
              <div className="side-card">
                <div className="side-card-title">
                  <div className="tiny-icon">
                    <ShieldCheck size={15} />
                  </div>
                  <strong>{t("evidenceFirst")}</strong>
                </div>
                <p>{t("evidenceDescription")}</p>
                <div className="side-rule" />
                <div className="metadata">
                  <span>{t("fileType")}</span>
                  <strong>
                    {current.file_type.toUpperCase()} {t("document")}
                  </strong>
                  <span>{t("status")}</span>
                  <strong className="status-ready">
                    {current.processing_status === "ready"
                      ? t("indexedSearchable")
                      : t(current.processing_status)}
                  </strong>
                  <span>{t("languageSupport")}</span>
                  <strong>{t("nepaliEnglish")}</strong>
                </div>
              </div>
              <div className="tip-card">
                <Sparkles size={16} />
                <div>
                  <strong>{t("tip")}</strong>
                  <p>{t("askEitherLanguage")}</p>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="content">
            <div className="empty-state">
              <strong>{t("documentNotFound")}</strong>
              <button
                className="primary"
                onClick={() => navigate("/documents")}
              >
                {t("openLibrary")}
              </button>
            </div>
          </section>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => {
            doUpload(e.target.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
        {upload.isPending && (
          <div className="toast">
            <LoaderCircle className="spin" size={16} /> {t("uploading")}
          </div>
        )}
        {error && !current && (
          <div className="toast error-toast">
            {error}
            <button onClick={() => setError("")}>{t("dismiss")}</button>
          </div>
        )}
        {dialog && (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDialog(null);
            }}
          >
            <section
              className="confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-dialog-title"
            >
              <button
                className="dialog-close"
                aria-label={t("close")}
                onClick={() => setDialog(null)}
              >
                ×
              </button>
              {dialog.mode === "rename" ? (
                <>
                  <h2 id="document-dialog-title">{t("renameDocument")}</h2>
                  <p>
                    {t("renameDescription").replace(
                      "{{extension}}",
                      dialog.doc.file_type,
                    )}
                  </p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      rename.mutate({
                        id: dialog.doc.id,
                        filename: renameValue.trim(),
                      });
                    }}
                  >
                    <label htmlFor="rename-document">{t("documentName")}</label>
                    <input
                      id="rename-document"
                      autoFocus
                      maxLength={255}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      required
                    />
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setDialog(null)}
                      >
                        {t("cancel")}
                      </button>
                      <button className="primary" disabled={rename.isPending}>
                        {rename.isPending ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          "Save name"
                        )}
                      </button>
                    </div>
                    {rename.error && (
                      <p className="error">{rename.error.message}</p>
                    )}
                  </form>
                </>
              ) : (
                <>
                  <h2 id="document-dialog-title">
                    {t("deleteDocumentQuestion")}
                  </h2>
                  <p>
                    “{dialog.doc.filename}” and its chat history will be
                    permanently deleted.
                  </p>
                  <div className="dialog-actions">
                    <button
                      className="secondary-btn"
                      onClick={() => setDialog(null)}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="danger-confirm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(dialog.doc.id)}
                    >
                      {remove.isPending ? (
                        <LoaderCircle size={15} className="spin" />
                      ) : (
                        t("deleteDocument")
                      )}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function WorkspacePage({
  docs,
  recentChats,
  onUpload,
  onLibrary,
  onContinue,
  onOpenChat,
  onPreference,
}: {
  docs: DocumentItem[];
  recentChats: RecentChat[];
  onUpload: () => void;
  onLibrary: () => void;
  onContinue: () => void;
  onOpenChat: (id: number) => void;
  onPreference: (id: number, preferences: { is_pinned?: boolean; is_starred?: boolean }) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="content workspace-page">
      <div className="hero">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("workspaceEyebrow")}
          </div>
          <h1>{t("welcome")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className="hero-orb">
          <div className="orb-inner">
            <Sparkles size={28} />
          </div>
        </div>
      </div>
      <div className="quick-actions">
        <button className="quick-action" onClick={onUpload}>
          <span className="quick-icon">
            <Plus size={19} />
          </span>
          <strong>{t("upload")}</strong>
          <span>{t("addPdfDocx")}</span>
          <ChevronRight size={16} />
        </button>
        <button
          className="quick-action"
          onClick={onContinue}
          disabled={!recentChats.length}
        >
          <span className="quick-icon">
            <MessageSquareText size={19} />
          </span>
          <strong>{t("continueChat")}</strong>
          <span>{recentChats[0]?.filename ?? t("askAboutDocument")}</span>
          <ChevronRight size={16} />
        </button>
        <button className="quick-action" onClick={onLibrary}>
          <span className="quick-icon">
            <LibraryBig size={19} />
          </span>
          <strong>{t("openLibrary")}</strong>
          <span>
            {docs.length}{" "}
            {t(
              docs.length === 1
                ? "documentCountSingular"
                : "documentCountPlural",
            )}{" "}
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="section-title recent-chat-title">
        <div>
          <h2>{t("recentChats")}</h2>
          <p>{t("recentChatsDescription")}</p>
        </div>
      </div>
      {recentChats.length ? (
        <div className="recent-chat-list">
          {recentChats.slice(0, 5).map((chat) => (
            <div className="recent-chat-row" key={chat.document_id}>
              <button className="recent-chat-open" onClick={() => onOpenChat(chat.document_id)}>
                <span className="recent-chat-icon"><MessageSquareText size={17} /></span>
                <span className="recent-chat-copy">
                  <strong>{chat.is_pinned && <Pin size={12}/>} {chat.is_starred && <Star size={12}/>} {chat.filename}</strong>
                  <span>{chat.last_message}</span>
                </span>
                <time>{new Date(chat.updated_at).toLocaleDateString()}</time>
                <ChevronRight size={16} />
              </button>
              <div className="chat-preferences">
                <button className={chat.is_pinned ? "selected" : ""} title={t(chat.is_pinned ? "unpinChat" : "pinChat")} aria-label={t(chat.is_pinned ? "unpinChat" : "pinChat")} onClick={() => onPreference(chat.document_id, { is_pinned: !chat.is_pinned })}><Pin size={14}/></button>
                <button className={chat.is_starred ? "selected" : ""} title={t(chat.is_starred ? "unstarChat" : "starChat")} aria-label={t(chat.is_starred ? "unstarChat" : "starChat")} onClick={() => onPreference(chat.document_id, { is_starred: !chat.is_starred })}><Star size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="recent-chat-empty">
          <MessageSquareText size={20} />
          <span>{t("recentChatsEmpty")}</span>
        </div>
      )}
    </section>
  );
}

type NotePayload = Omit<StudyNote, "id" | "created_at" | "updated_at">;

function StudyDashboard({
  docs,
  notes,
  bookmarks,
  studyKind,
  initialDocumentId,
  onOpenReference,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteBookmark,
}: {
  docs: DocumentItem[];
  notes: StudyNote[];
  bookmarks: Bookmark[];
  studyKind: StudyKind | null;
  initialDocumentId: number | null;
  onOpenReference: (documentId: number, messageId: number | null, page: number | null, text: string) => void;
  onCreateNote: (payload: NotePayload) => void;
  onUpdateNote: (id: number, changes: Partial<Pick<StudyNote, "title" | "content" | "tags" | "language">>) => void;
  onDeleteNote: (id: number) => void;
  onDeleteBookmark: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StudyNote | null>(null);
  const [documentId, setDocumentId] = useState(initialDocumentId ? String(initialDocumentId) : "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const openCreate = () => {
    setEditing(null);
    setDocumentId(initialDocumentId ? String(initialDocumentId) : docs[0] ? String(docs[0].id) : "");
    setTitle("");
    setContent("");
    setLanguage("en");
    setShowForm(true);
  };
  const openEdit = (note: StudyNote) => {
    setEditing(note);
    setDocumentId(String(note.document_id));
    setTitle(note.title);
    setContent(note.content);
    setLanguage(note.language);
    setShowForm(true);
  };
  return <div className="study-dashboard">
    {studyKind ? <QuizFlashcardStudio docs={docs} initialDocumentId={initialDocumentId} fixedKind={studyKind}/> : null}
    {!studyKind && <section className="content study-page">
      <div className="section-title library-heading">
        <div><div className="eyebrow"><span className="eyebrow-line"/>{t("studySpace")}</div><h1>{t("notesAndBookmarks")}</h1><p>{t("studyDescription")}</p></div>
        <button className="primary" onClick={openCreate}><Plus size={16}/>{t("createNote")}</button>
      </div>
      {showForm && <form className="study-note-form" onSubmit={event => {
        event.preventDefault();
        if (!documentId) return;
        if (editing) onUpdateNote(editing.id, { title: title.trim(), content: content.trim(), language });
        else onCreateNote({ document_id: Number(documentId), source_message_id: null, title: title.trim(), content: content.trim(), tags: "", page_numbers: [], language });
        setShowForm(false);
      }}>
        <div className="study-form-heading"><h2>{editing ? t("editNote") : t("createNote")}</h2><button type="button" className="icon-btn" aria-label={t("close")} onClick={() => setShowForm(false)}>×</button></div>
        <label>{t("document")}<select required value={documentId} disabled={Boolean(editing)} onChange={event => setDocumentId(event.target.value)}>{docs.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}</select></label>
        <label>{t("noteTitle")}<input required maxLength={255} value={title} onChange={event => setTitle(event.target.value)}/></label>
        <label>{t("noteContent")}<textarea required maxLength={30000} rows={4} value={content} onChange={event => setContent(event.target.value)}/></label>
        <label>{t("studyOutputLanguage")}<select value={language} onChange={event => setLanguage(event.target.value as "en" | "ne")}><option value="en">English</option><option value="ne">नेपाली</option></select></label>
        <div className="dialog-actions"><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>{t("cancel")}</button><button className="primary">{t("saveNote")}</button></div>
      </form>}
      <div className="study-list">
        {notes.map(note => <article className="study-card" key={`note-${note.id}`}><div className="study-card-icon"><NotebookPen size={17}/></div><div className="study-card-body"><div className="study-card-heading"><strong>{note.title}</strong><span>{docs.find(doc => doc.id === note.document_id)?.filename ?? t("document")}</span></div><p>{note.content}</p><div className="study-card-meta">{note.page_numbers.length > 0 && <span>{t("pageReferences")}: {note.page_numbers.join(", ")}</span>}<time>{new Date(note.created_at).toLocaleDateString()}</time></div></div><div className="study-card-actions"><button title={t("openReference")} aria-label={t("openReference")} onClick={() => onOpenReference(note.document_id, note.source_message_id, note.page_numbers[0] ?? null, note.content)}><ArrowUpRight size={15}/></button><button title={t("editNote")} aria-label={t("editNote")} onClick={() => openEdit(note)}><Pencil size={15}/></button><button title={t("delete")} aria-label={t("delete")} onClick={() => onDeleteNote(note.id)}><Trash2 size={15}/></button></div></article>)}
        {bookmarks.map(bookmark => <article className="study-card" key={`bookmark-${bookmark.id}`}><div className="study-card-icon"><BookmarkIcon size={17}/></div><div className="study-card-body"><div className="study-card-heading"><strong>{bookmark.kind === "page" ? t("pageBookmark") : bookmark.kind === "answer" ? t("answerBookmark") : t("passageBookmark")}</strong><span>{docs.find(doc => doc.id === bookmark.document_id)?.filename ?? t("document")}</span></div><p>{bookmark.kind === "page" ? `${t("pageNumber")} ${bookmark.page_number}` : bookmark.text}</p><div className="study-card-meta">{bookmark.page_numbers.length > 0 && <span>{t("pageReferences")}: {bookmark.page_numbers.join(", ")}</span>}<time>{new Date(bookmark.created_at).toLocaleDateString()}</time></div></div><div className="study-card-actions"><button title={t("openReference")} aria-label={t("openReference")} onClick={() => onOpenReference(bookmark.document_id, bookmark.source_message_id, bookmark.page_number ?? bookmark.page_numbers[0] ?? null, bookmark.text)}><ArrowUpRight size={15}/></button><button title={t("delete")} aria-label={t("delete")} onClick={() => onDeleteBookmark(bookmark.id)}><Trash2 size={15}/></button></div></article>)}
        {!notes.length && !bookmarks.length && <div className="library-empty"><div className="empty-icon"><NotebookPen size={22}/></div><strong>{t("studyEmpty")}</strong><span>{t("studyEmptyHint")}</span></div>}
      </div>
    </section>}
  </div>;
}

function LibraryPage({
  docs,
  query,
  onQuery,
  onUpload,
  onOpen,
  onRename,
  onDelete,
  onStudy,
  t,
}: {
  docs: DocumentItem[];
  query: string;
  onQuery: (value: string) => void;
  onUpload: () => void;
  onOpen: (doc: DocumentItem) => void;
  onRename: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  onStudy: (doc: DocumentItem, kind: StudyKind) => void;
  t: (key: string) => string;
}) {
  return (
    <section className="content library-page">
      <div className="section-title library-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("yourDocuments")}
          </div>
          <h1>{t("library")}</h1>
          <p>{t("browseDocuments")}</p>
        </div>
        <button className="primary" onClick={onUpload}>
          <Plus size={17} />
          {t("upload")}
        </button>
      </div>
      <div className="search-wrap">
        <Search size={17} />
        <input
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        {query && (
          <button
            className="clear-search"
            onClick={() => onQuery("")}
            aria-label={t("clearSearch")}
          >
            ×
          </button>
        )}
      </div>
      {docs.length ? (
        <div className="document-grid">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={() => onOpen(doc)}
              onRename={() => onRename(doc)}
              onDelete={() => onDelete(doc)}
              onStudy={(kind) => onStudy(doc, kind)}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="library-empty">
          <div className="empty-icon">
            <FileText size={23} />
          </div>
          <strong>{query ? t("noSearchResults") : t("emptyLibrary")}</strong>
          <span>{query ? t("emptySearchHint") : t("uploadFirstDocument")}</span>
          {!query && (
            <button className="primary" onClick={onUpload}>
              <Plus size={16} />
              {t("upload")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

type ConversationViewProps = {
  messages: ChatMessage[];
  t: (key: string) => string;
  selectedSource: { messageId: number; index: number } | null;
  setSelectedSource: (
    value: { messageId: number; index: number } | null,
  ) => void;
  translationCache: Record<string, string>;
  translatedView: Record<string, boolean>;
  translationErrors: Record<string, string>;
  translationPendingId: string | null;
  onTranslate: (id: number, text: string) => void;
  onToggleTranslation: (id: number) => void;
  onSuggest: (question: string) => void;
  savedMessageIds: Set<number>;
  bookmarkedIds: Set<number>;
  onSaveAnswer: (message: ChatMessage, content: string, language: "en" | "ne") => void;
  onBookmarkAnswer: (message: ChatMessage) => void;
  onBookmarkSource: (message: ChatMessage, source: Source) => void;
};
function ConversationView({
  messages,
  t,
  selectedSource,
  setSelectedSource,
  translationCache,
  translatedView,
  translationErrors,
  translationPendingId,
  onTranslate,
  onToggleTranslation,
  onSuggest,
  savedMessageIds,
  bookmarkedIds,
  onSaveAnswer,
  onBookmarkAnswer,
  onBookmarkSource,
}: ConversationViewProps) {
  if (messages.length === 0)
    return (
      <div className="chat-empty">
        <div className="sparkle-icon">
          <Sparkles size={20} />
        </div>
        <h2>{t("whatToKnow")}</h2>
        <p>{t("groundedAnswer")}</p>
        <div className="suggestions">
          {["suggestSummary", "suggestFindings", "suggestExplain"].map(
            (key) => (
              <button key={key} onClick={() => onSuggest(t(key))}>
                {t(key)}
                <ChevronRight size={14} />
              </button>
            ),
          )}
        </div>
      </div>
    );
  return (
    <div className="conversation">
      {messages.map((message) => {
        if (message.role === "user")
          return (
            <div className="user-message" key={message.id}>
              <div className="message-role">{t("you")}</div>
              <p>{message.content}</p>
            </div>
          );
        const key = String(message.id);
        const cachedTranslation =
          translationCache[key] || message.translated_content || "";
        const translated = Boolean(translatedView[key] && cachedTranslation);
        const text = translated ? cachedTranslation : message.content;
        const activeIndex =
          selectedSource?.messageId === message.id
            ? selectedSource.index
            : null;
        const chooseSource = (index: number | null) =>
          setSelectedSource(
            index === null || activeIndex === index
              ? null
              : { messageId: message.id, index },
          );
        return (
          <article className="assistant-message" key={message.id}>
            <div className="answer-label">
              <Sparkles size={15} /> {t("answer")}
            </div>
            <div
              className={`answer-text answer-markdown ${translated ? "translated-text" : ""}`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p>
                      {renderCitations(
                        children,
                        message.sources,
                        activeIndex,
                        chooseSource,
                      )}
                    </p>
                  ),
                  li: ({ children }) => (
                    <li>
                      {renderCitations(
                        children,
                        message.sources,
                        activeIndex,
                        chooseSource,
                      )}
                    </li>
                  ),
                  td: ({ children }) => (
                    <td>
                      {renderCitations(
                        children,
                        message.sources,
                        activeIndex,
                        chooseSource,
                      )}
                    </td>
                  ),
                  th: ({ children }) => (
                    <th>
                      {renderCitations(
                        children,
                        message.sources,
                        activeIndex,
                        chooseSource,
                      )}
                    </th>
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
            <div className="translation-controls">
              <button
                className="translate-button"
                disabled={translationPendingId === key}
                onClick={() => {
                  if (translationCache[key] || message.translated_content)
                    onToggleTranslation(message.id);
                  else onTranslate(message.id, message.content);
                }}
              >
                {translationPendingId === key ? (
                  <>
                    <LoaderCircle size={14} className="spin" />
                    {t("translating")}
                  </>
                ) : translationCache[key] || message.translated_content ? (
                  translated ? (
                    t("showOriginal")
                  ) : (
                    t("showTranslation")
                  )
                ) : (
                  t("translateNepali")
                )}
              </button>
              {translationErrors[key] && (
                <span className="translation-error">
                  {translationErrors[key]}{" "}
                  <button
                    onClick={() => onTranslate(message.id, message.content)}
                  >
                    {t("retry")}
                  </button>
                </span>
              )}
            </div>
            <div className="answer-actions">
              <button className={savedMessageIds.has(message.id) ? "selected" : ""} disabled={savedMessageIds.has(message.id)} onClick={() => onSaveAnswer(message, text, translated ? "ne" : "en")}><NotebookPen size={13}/>{t(savedMessageIds.has(message.id) ? "savedToNotes" : "saveToNotes")}</button>
              <button className={bookmarkedIds.has(message.id) ? "selected" : ""} disabled={bookmarkedIds.has(message.id)} onClick={() => onBookmarkAnswer(message)}><BookmarkIcon size={13}/>{t(bookmarkedIds.has(message.id) ? "bookmarked" : "bookmarkAnswer")}</button>
            </div>
            {message.sources.length > 0 && (
              <div className="source-area">
                {!/\[Source\s+\d+(?:;[^\]]*)?\]/i.test(message.content) && (
                  <div className="source-links" aria-label={t("answerSources")}>
                    {message.sources.map((_, i) => (
                      <SourceButton
                        key={i}
                        index={i}
                        active={activeIndex === i}
                        onClick={() => chooseSource(i)}
                      />
                    ))}
                  </div>
                )}
                {activeIndex !== null && message.sources[activeIndex] && (
                  <SourceCard
                    source={message.sources[activeIndex]}
                    index={activeIndex}
                    onBookmark={() => onBookmarkSource(message, message.sources[activeIndex])}
                    t={t}
                  />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function DocumentCard({
  doc,
  onOpen,
  onRename,
  onDelete,
  onStudy,
  t,
}: {
  doc: DocumentItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onStudy: (kind: StudyKind) => void;
  t: (s: string) => string;
}) {
  return (
    <article className="document-card">
      <button className="card-open" onClick={onOpen}>
        <div className="file-icon">
          <FileText size={19} />
        </div>
        <div className="doc-card-name">{doc.filename}</div>
        <div className="doc-card-meta">
          {doc.page_count
            ? `${doc.page_count} ${t("pageSuffix")}`
            : t("document")}{" "}
          <span>·</span> {new Date(doc.uploaded_at).toLocaleDateString()}
        </div>
        <div className={`status-pill ${doc.processing_status}`}>
          <i />
          {doc.processing_status === "ready"
            ? t("ready")
            : doc.processing_status === "failed"
              ? t("failed")
              : t("processing")}
        </div>
      </button>
      <details className="card-menu">
        <summary aria-label={`${t("rename")} / ${t("delete")} ${doc.filename}`}>
          <MoreHorizontal size={17} />
        </summary>
        <div className="card-menu-popover">
          <button onClick={() => onStudy("quiz")} disabled={doc.processing_status !== "ready"}>
            <ClipboardList size={14} />
            {t("generateQuiz")}
          </button>
          <button onClick={() => onStudy("flashcards")} disabled={doc.processing_status !== "ready"}>
            <Layers size={14} />
            {t("generateFlashcards")}
          </button>
          <button onClick={onRename}>
            <Pencil size={14} />
            {t("rename")}
          </button>
          <button className="menu-danger" onClick={onDelete}>
            <Trash2 size={14} />
            {t("delete")}
          </button>
        </div>
      </details>
    </article>
  );
}
export default App;

function SourceButton({
  index,
  active,
  onClick,
}: {
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      className={`citation-link ${active ? "selected" : ""}`}
      onClick={onClick}
      aria-expanded={active}
      aria-label={t("showSource", { number: index + 1 })}
    >
      [{t("source", { number: index + 1 })}]
    </button>
  );
}
function renderCitations(
  children: ReactNode,
  sources: Source[],
  selected: number | null,
  onSelect: (index: number | null) => void,
  seen = new Set<number>(),
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = child.split(
        /(\[Source\s+\d+(?:\s*,\s*Source\s+\d+)*(?:;[^\]]*)?\])/gi,
      );
      return parts.map((part, i) => {
        if (
          !/^\[Source\s+\d+(?:\s*,\s*Source\s+\d+)*(?:;[^\]]*)?\]$/i.test(part)
        )
          return part;
        const refs = Array.from(
          part.matchAll(/Source\s+(\d+)/gi),
          (match) => Number(match[1]) - 1,
        );
        const chips = refs
          .filter(
            (index) => index >= 0 && index < sources.length && !seen.has(index),
          )
          .map((index) => {
            seen.add(index);
            return (
              <SourceButton
                key={`citation-${index}-${i}`}
                index={index}
                active={selected === index}
                onClick={() => onSelect(index)}
              />
            );
          });
        return chips.length ? <>{chips}</> : part;
      });
    }
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.props.children !== undefined &&
      child.type !== "code" &&
      child.type !== "pre"
    ) {
      return cloneElement(child, {
        children: renderCitations(
          child.props.children,
          sources,
          selected,
          onSelect,
          seen,
        ),
      });
    }
    return child;
  });
}
function SourceCard({ source, index, onBookmark, t }: { source: Source; index: number; onBookmark: () => void; t: (key: string) => string }) {
  return (
    <article className="source-card" aria-live="polite">
      <div>
        <span className="source-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <strong className="source-label">Source {index + 1}</strong>
        <span className="page-chip">
          {source.page_number
            ? `Page ${source.page_number}`
            : "Document passage"}
        </span>
      </div>
      <p>{source.text}</p>
      <button className="study-action" onClick={onBookmark}><BookmarkIcon size={13}/>{t("bookmarkPassage")}</button>
    </article>
  );
}
