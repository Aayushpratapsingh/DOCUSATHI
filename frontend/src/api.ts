const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export type DocumentItem = {id:number; filename:string; file_type:string; processing_status:string; page_count:number; uploaded_at:string}
export type Source = {chunk_id:number; page_number:number|null; text:string; score:number}
export type Answer = {answer:string; sources:Source[]}
export type ChatMessage = {id:number; role:'user'|'assistant'; content:string; sources:Source[]; translated_content:string|null; created_at:string}
export type UserProfile = {id:number;name:string;email:string}
export type RecentChat = {document_id:number;filename:string;last_message:string;updated_at:string}

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
  rename: (id:number,filename:string) => request<DocumentItem>(`/api/documents/${id}`,{method:'PATCH',body:JSON.stringify({filename})}),
  upload: (file:File) => {const form=new FormData(); form.append('file',file); return request<DocumentItem>('/api/documents',{method:'POST',body:form})},
  retry: (id:number) => request<DocumentItem>(`/api/documents/${id}/retry`,{method:'POST'}),
  remove: (id:number) => request<void>(`/api/documents/${id}`,{method:'DELETE'}),
  ask: (id:number,question:string) => request<Answer>(`/api/documents/${id}/ask`,{method:'POST',body:JSON.stringify({question})}),
  messages: (id:number) => request<ChatMessage[]>(`/api/documents/${id}/messages`),
  translateNepali: (messageId:number,text:string) => request<{translated_text:string}>('/api/translate',{method:'POST',body:JSON.stringify({message_id:messageId,text})})
}
