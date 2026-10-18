const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export type DocumentItem = {id:number; filename:string; file_type:string; processing_status:string; page_count:number; uploaded_at:string}
export type Source = {chunk_id:number; page_number:number|null; text:string; score:number}
export type Answer = {answer:string; sources:Source[]}
export type ChatMessage = {id:number; role:'user'|'assistant'; content:string; sources:Source[]; translated_content:string|null; created_at:string}
export type UserProfile = {id:number;name:string;email:string}
export type RecentChat = {document_id:number;filename:string;last_message:string;updated_at:string;is_pinned:boolean;is_starred:boolean}
export type StudyNote = {id:number;document_id:number;source_message_id:number|null;title:string;content:string;tags:string;page_numbers:number[];language:'en'|'ne';created_at:string;updated_at:string}
export type Bookmark = {id:number;document_id:number;source_message_id:number|null;kind:'page'|'passage'|'answer';page_number:number|null;page_numbers:number[];text:string;created_at:string}
export type StudyKind = 'quiz'|'flashcards'
export type StudyQuestionType = 'multiple_choice'|'short_answer'|'true_false'|'mixed'
export type StudyItem = {question?:string;question_type?:Exclude<StudyQuestionType,'mixed'>;options?:string[];correct_answer?:string;front?:string;back?:string;explanation:string;source_chunk_ids:number[];page_numbers:number[]}
export type StudyProgress = {current_index:number;answers:Record<string,string>;statuses:Record<string,'know'|'review'>;completed:boolean;score:number}
export type StudySet = {id:number;document_id:number;kind:StudyKind;title:string;config:{chapter:string|null;page_start:number|null;page_end:number|null;difficulty:'easy'|'medium'|'hard';count:number;question_type:StudyQuestionType;language:'en'|'ne'};items:StudyItem[];progress:StudyProgress;created_at:string;updated_at:string}
export type StudyOptions = {pages:number[];chapters:{title:string;page_start:number|null;page_end:number|null}[]}
export type StudyGeneratePayload = {kind:StudyKind;chapter:string|null;page_start:number|null;page_end:number|null;difficulty:'easy'|'medium'|'hard';count:number;question_type:StudyQuestionType;language:'en'|'ne'}

function token() { return localStorage.getItem('docintel_token') || '' }
async function request<T>(path:string, init:RequestInit = {}):Promise<T> {
  const headers = new Headers(init.headers)
  if (token()) headers.set('Authorization', `Bearer ${token()}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type','application/json')
  const response = await fetch(`${API}${path}`, {...init, headers})
  if (!response.ok) {
    const data = await response.json().catch(()=>({detail:'Something went wrong'}))
    throw new Error(data.detail || 'Something went wrong')
  }
  if (response.status === 204) return undefined as T
  return response.json()
}
export const api = {
  login: (email:string,password:string) => request<{access_token:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  register: (name:string,email:string,password:string) => request<{access_token:string}>('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password})}),
  me: () => request<{id:number;name:string;email:string}>('/api/auth/me'),
  updateProfile: (name:string,email:string) => request<UserProfile>('/api/auth/me',{method:'PATCH',body:JSON.stringify({name,email})}),
  documents: () => request<DocumentItem[]>('/api/documents'),
  recentChats: () => request<RecentChat[]>('/api/conversations/recent'),
  setChatPreference: (id:number,preferences:{is_pinned?:boolean;is_starred?:boolean}) => request<RecentChat>(`/api/conversations/${id}/preferences`,{method:'PATCH',body:JSON.stringify(preferences)}),
  rename: (id:number,filename:string) => request<DocumentItem>(`/api/documents/${id}`,{method:'PATCH',body:JSON.stringify({filename})}),
  upload: (file:File) => {const form=new FormData(); form.append('file',file); return request<DocumentItem>('/api/documents',{method:'POST',body:form})},
  retry: (id:number) => request<DocumentItem>(`/api/documents/${id}/retry`,{method:'POST'}),
  remove: (id:number) => request<void>(`/api/documents/${id}`,{method:'DELETE'}),
  ask: (id:number,question:string) => request<Answer>(`/api/documents/${id}/ask`,{method:'POST',body:JSON.stringify({question})}),
  messages: (id:number) => request<ChatMessage[]>(`/api/documents/${id}/messages`),
  notes: () => request<StudyNote[]>('/api/notes'),
  createNote: (note:Omit<StudyNote,'id'|'created_at'|'updated_at'>) => request<StudyNote>('/api/notes',{method:'POST',body:JSON.stringify(note)}),
  updateNote: (id:number,changes:Partial<Pick<StudyNote,'title'|'content'|'tags'|'language'>>) => request<StudyNote>(`/api/notes/${id}`,{method:'PATCH',body:JSON.stringify(changes)}),
  deleteNote: (id:number) => request<void>(`/api/notes/${id}`,{method:'DELETE'}),
  bookmarks: () => request<Bookmark[]>('/api/bookmarks'),
  createBookmark: (bookmark:Omit<Bookmark,'id'|'created_at'>) => request<Bookmark>('/api/bookmarks',{method:'POST',body:JSON.stringify(bookmark)}),
  deleteBookmark: (id:number) => request<void>(`/api/bookmarks/${id}`,{method:'DELETE'}),
  studyOptions: (documentId:number) => request<StudyOptions>(`/api/documents/${documentId}/study-options`),
  studySets: () => request<StudySet[]>('/api/study-sets'),
  generateStudySet: (documentId:number,payload:StudyGeneratePayload) => request<StudySet>(`/api/documents/${documentId}/study-sets`,{method:'POST',body:JSON.stringify(payload)}),
  updateStudyProgress: (id:number,progress:StudyProgress) => request<StudySet>(`/api/study-sets/${id}/progress`,{method:'PATCH',body:JSON.stringify(progress)}),
  regenerateStudyItem: (id:number,index:number) => request<StudySet>(`/api/study-sets/${id}/regenerate/${index}`,{method:'POST'}),
  deleteStudySet: (id:number) => request<void>(`/api/study-sets/${id}`,{method:'DELETE'}),
  translateNepali: (messageId:number,text:string) => request<{translated_text:string}>('/api/translate',{method:'POST',body:JSON.stringify({message_id:messageId,text})})
}
